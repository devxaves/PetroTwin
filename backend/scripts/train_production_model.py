"""
Training script for the Hybrid CSS Production-Response Model.

Extracts daily production records and associated CSS cycle parameters from DB,
computes the deterministic physics baseline forecast, calculates residual error,
and trains a HistGradientBoostingRegressor using a strict by-well train/test split
(WELL-001..006 for train, WELL-007..008 for test).

Saves model bundle to app/ml/artifacts/css_production_model_v1.joblib.
"""

from __future__ import annotations

import asyncio
import math
import sys
from datetime import UTC, datetime
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from sqlalchemy import select

from app.db.models import CSSCycle, Production
from app.db.session import async_session_factory
from app.ml.production_model import (
    DEFAULT_MODEL_PATH,
    FEATURE_COLUMNS,
    physics_daily_oil_forecast,
    save_production_bundle,
    train_residual_model,
)

TRAIN_WELLS = [
    "WELL-001",
    "WELL-002",
    "WELL-003",
    "WELL-004",
    "WELL-005",
    "WELL-006",
]
TEST_WELLS = ["WELL-007", "WELL-008"]


async def load_training_dataset():
    """Load cycles and production records, associating each day with cycle params."""
    async with async_session_factory() as session:
        # Load cycles
        q_cycles = select(CSSCycle).order_by(CSSCycle.well_id, CSSCycle.cycle_id)
        cycles = (await session.execute(q_cycles)).scalars().all()

        # Load daily production records
        q_prod = select(Production).order_by(Production.well_id, Production.timestamp)
        prods = (await session.execute(q_prod)).scalars().all()

    # Organize production by well_id
    prods_by_well: dict[str, list[Production]] = {}
    for p in prods:
        prods_by_well.setdefault(p.well_id, []).append(p)

    x_train_list: list[list[float]] = []
    y_res_train: list[float] = []
    y_act_train: list[float] = []
    y_phys_train: list[float] = []

    x_test_list: list[list[float]] = []
    y_res_test: list[float] = []
    y_act_test: list[float] = []
    y_phys_test: list[float] = []

    for cycle in cycles:
        well_id = cycle.well_id
        is_test = well_id in TEST_WELLS
        soak_days = max(1, (cycle.soak_end - cycle.soak_start).days)

        well_prods = prods_by_well.get(well_id, [])
        # Find production records within this cycle's production window
        cycle_prods = [p for p in well_prods if cycle.production_start <= p.timestamp <= cycle.production_end]

        for p_rec in cycle_prods:
            day_idx = max(1, (p_rec.timestamp - cycle.production_start).days + 1)

            # Compute physics prediction for this day
            q_phys, temp_c, visc = physics_daily_oil_forecast(
                cycle_number=cycle.cycle_id,
                steam_volume_t=cycle.steam_volume_t,
                steam_pressure_mpa=cycle.steam_pressure,
                soak_days=soak_days,
                day_in_cycle=day_idx,
            )

            actual_oil = float(p_rec.oil_rate_bopd)
            residual = actual_oil - q_phys

            feature_vec = [
                float(cycle.cycle_id),
                float(cycle.steam_volume_t),
                float(cycle.steam_pressure),
                float(soak_days),
                float(day_idx),
                float(temp_c),
                float(visc),
                float(q_phys),
            ]

            if is_test:
                x_test_list.append(feature_vec)
                y_res_test.append(residual)
                y_act_test.append(actual_oil)
                y_phys_test.append(q_phys)
            else:
                x_train_list.append(feature_vec)
                y_res_train.append(residual)
                y_act_train.append(actual_oil)
                y_phys_train.append(q_phys)

    return (
        np.array(x_train_list, dtype=np.float64),
        np.array(y_res_train, dtype=np.float64),
        np.array(y_act_train, dtype=np.float64),
        np.array(y_phys_train, dtype=np.float64),
        np.array(x_test_list, dtype=np.float64),
        np.array(y_res_test, dtype=np.float64),
        np.array(y_act_test, dtype=np.float64),
        np.array(y_phys_test, dtype=np.float64),
    )


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> tuple[float, float]:
    """Compute MAE and RMSE."""
    errors = y_true - y_pred
    mae = float(np.mean(np.abs(errors)))
    rmse = float(math.sqrt(np.mean(errors**2)))
    return round(mae, 3), round(rmse, 3)


def main():
    print("=" * 70)
    print("Starting Hybrid CSS Production Model Training")
    print(f"Train Wells: {TRAIN_WELLS}")
    print(f"Test Wells:  {TEST_WELLS}")
    print("=" * 70)

    (
        x_train,
        y_res_train,
        _y_act_train,
        _y_phys_train,
        x_test,
        _y_res_test,
        y_act_test,
        y_phys_test,
    ) = asyncio.run(load_training_dataset())

    print(f"Train records: {len(x_train)}")
    print(f"Test records:  {len(x_test)}")

    # 1. Physics-only baseline error on held-out test wells
    phys_mae, phys_rmse = compute_metrics(y_act_test, y_phys_test)
    print("\n" + "-" * 70)
    print(f"PHYSICS-ONLY TEST ERROR:  MAE = {phys_mae:.3f} bopd | RMSE = {phys_rmse:.3f} bopd")
    print("-" * 70)

    # 2. Train ML residual regressor
    print("\nTraining HistGradientBoostingRegressor on physics residuals...")
    residual_model = train_residual_model(x_train, y_res_train)

    # 3. Predict residuals and compute hybrid forecast
    pred_res_test = residual_model.predict(x_test)
    y_hybrid_test = np.maximum(0.0, y_phys_test + pred_res_test)

    hyb_mae, hyb_rmse = compute_metrics(y_act_test, y_hybrid_test)
    mae_pct_improve = ((phys_mae - hyb_mae) / phys_mae) * 100
    rmse_pct_improve = ((phys_rmse - hyb_rmse) / phys_rmse) * 100

    print("\n" + "-" * 70)
    print(f"HYBRID (PHYSICS + ML RESIDUAL) ERROR: MAE = {hyb_mae:.3f} bopd | RMSE = {hyb_rmse:.3f} bopd")
    print(f"ERROR REDUCTION OVER PHYSICS-ALONE:  MAE: -{mae_pct_improve:.1f}% | RMSE: -{rmse_pct_improve:.1f}%")
    print("-" * 70)

    beats = hyb_rmse < phys_rmse
    print(f"HYBRID BEATS PHYSICS-ALONE: {'YES' if beats else 'NO'}")

    # 4. Save Artifact
    bundle = {
        "model": residual_model,
        "feature_columns": FEATURE_COLUMNS,
        "version": "v1",
        "trained_at": datetime.now(UTC).isoformat(),
        "metrics": {
            "train_wells": TRAIN_WELLS,
            "test_wells": TEST_WELLS,
            "train_samples": len(x_train),
            "test_samples": len(x_test),
            "physics_mae": phys_mae,
            "physics_rmse": phys_rmse,
            "hybrid_mae": hyb_mae,
            "hybrid_rmse": hyb_rmse,
            "mae_reduction_pct": round(mae_pct_improve, 2),
            "rmse_reduction_pct": round(rmse_pct_improve, 2),
            "beats_physics": beats,
        },
    }

    save_production_bundle(bundle, DEFAULT_MODEL_PATH)
    print(f"\nModel bundle saved successfully to {DEFAULT_MODEL_PATH}")
    print("=" * 70)


if __name__ == "__main__":
    main()

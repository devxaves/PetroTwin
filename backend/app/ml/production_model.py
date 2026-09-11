"""
Hybrid CSS Production-Response Model.

Combines a first-principles reduced-order reservoir physics model
(thermal decay + Arrhenius viscosity + Darcy inflow + pump kinematics)
with an ML residual correction layer (HistGradientBoostingRegressor)
trained on empirical cycle residuals to forecast daily oil production.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor

from app.simulation.inflow_and_pump_model import (
    inflow_rate,
    oil_production_rate,
    pump_fillage,
)
from app.simulation.thermal_model import calculate_k_decay, reservoir_temperature
from app.simulation.viscosity_model import oil_viscosity_cp

DEFAULT_MODEL_PATH = Path(__file__).parent / "artifacts" / "css_production_model_v1.joblib"

FEATURE_COLUMNS = [
    "cycle_number",
    "steam_volume_t",
    "steam_pressure_mpa",
    "soak_days",
    "day_in_cycle",
    "predicted_temp_c",
    "predicted_visc_cp",
    "physics_oil_rate",
]

_CACHED_PRODUCTION_BUNDLE: dict[str, Any] | None = None


def physics_daily_oil_forecast(
    cycle_number: int,
    steam_volume_t: float,
    steam_pressure_mpa: float,
    soak_days: int | float,
    day_in_cycle: int,
    t_base_c: float = 45.0,
    stroke_length_in: float = 120.0,
    spm: float = 8.0,
    res_pressure_psi: float = 1250.0,
    pwf_psi: float = 300.0,
) -> tuple[float, float, float]:
    """
    Compute first-principles physical prediction for a single cycle day.

    Returns:
        (physics_oil_rate_bopd, temperature_c, viscosity_cp)
    """
    # 1. Thermal response
    # Peak temperature depends on steam volume and soak efficiency
    t_peak = min(240.0, 160.0 + (steam_volume_t / 4000.0) * 80.0 + min(soak_days, 5) * 4.0)

    k_decay = calculate_k_decay(cycle_number=cycle_number, steam_volume_t=steam_volume_t)
    t_hours = float(day_in_cycle * 24)
    temp_c = reservoir_temperature(
        t_hours=t_hours,
        t_base_c=t_base_c,
        t_peak_c=t_peak,
        k_decay=k_decay,
    )

    # 2. Viscosity response
    viscosity = oil_viscosity_cp(temp_c)

    # 3. Reservoir inflow (pressure slightly declines over production period)
    cycle_prog = min(1.0, day_in_cycle / 120.0)
    p_res = res_pressure_psi * (1.0 - 0.20 * cycle_prog)
    inflow = inflow_rate(p_res, pwf_psi, viscosity)

    # 4. Pump fillage and oil rate
    theo_disp = (stroke_length_in * 3.14159 / 9702.0) * spm * 1440.0
    fill = pump_fillage(inflow, theo_disp)
    q_oil_phys = oil_production_rate(fill, spm, stroke_length_in)

    return q_oil_phys, temp_c, viscosity


def generate_physics_curve(
    cycle_number: int,
    steam_volume_t: float,
    steam_pressure_mpa: float,
    soak_days: int | float,
    prod_days: int = 90,
) -> list[dict[str, float]]:
    """Generate daily physics curve for an entire cycle duration."""
    curve = []
    for day in range(1, prod_days + 1):
        q_phys, temp_c, visc = physics_daily_oil_forecast(
            cycle_number=cycle_number,
            steam_volume_t=steam_volume_t,
            steam_pressure_mpa=steam_pressure_mpa,
            soak_days=soak_days,
            day_in_cycle=day,
        )
        curve.append(
            {
                "day": float(day),
                "physics_oil_rate": round(q_phys, 2),
                "temperature_c": round(temp_c, 2),
                "viscosity_cp": round(visc, 2),
            }
        )
    return curve


def train_residual_model(
    x_train: np.ndarray,
    y_residuals: np.ndarray,
    random_state: int = 42,
) -> HistGradientBoostingRegressor:
    """Train gradient boosting regressor on physics residual errors."""
    reg = HistGradientBoostingRegressor(
        max_iter=120,
        learning_rate=0.06,
        max_leaf_nodes=31,
        min_samples_leaf=10,
        random_state=random_state,
    )
    reg.fit(x_train, y_residuals)
    return reg


def save_production_bundle(bundle: dict[str, Any], path: str | Path = DEFAULT_MODEL_PATH) -> None:
    """Save model bundle to disk."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, p)


def load_production_model(path: str | Path = DEFAULT_MODEL_PATH, force_reload: bool = False) -> dict[str, Any]:
    """Load cached or saved production model bundle."""
    global _CACHED_PRODUCTION_BUNDLE
    if _CACHED_PRODUCTION_BUNDLE is not None and not force_reload:
        return _CACHED_PRODUCTION_BUNDLE

    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Production model not found at {p}. Run train_production_model.py first.")

    bundle = joblib.load(p)
    _CACHED_PRODUCTION_BUNDLE = bundle
    return bundle


def forecast_production_cycle(
    cycle_number: int,
    steam_volume_t: float,
    steam_pressure_mpa: float,
    soak_days: int | float,
    prod_days: int = 90,
    model_path: str | Path = DEFAULT_MODEL_PATH,
) -> dict[str, Any]:
    """
    Forecast full cycle daily production using the hybrid (Physics + ML Residual) model.

    Returns:
        Dictionary with:
          - days: list of day indices
          - physics_rates: list of physics-only oil rates (bopd)
          - hybrid_rates: list of hybrid (physics + ML residual) rates (bopd)
          - temperatures: list of reservoir temperatures (C)
          - viscosities: list of dynamic viscosities (cP)
          - cumulative_oil_physics: total physics bbl
          - cumulative_oil_hybrid: total hybrid bbl
    """
    bundle = load_production_model(model_path)
    model: HistGradientBoostingRegressor = bundle["model"]

    days_list: list[int] = []
    physics_rates: list[float] = []
    hybrid_rates: list[float] = []
    temperatures: list[float] = []
    viscosities: list[float] = []

    features_matrix: list[list[float]] = []

    for d in range(1, prod_days + 1):
        q_phys, temp_c, visc = physics_daily_oil_forecast(
            cycle_number=cycle_number,
            steam_volume_t=steam_volume_t,
            steam_pressure_mpa=steam_pressure_mpa,
            soak_days=soak_days,
            day_in_cycle=d,
        )
        row = [
            float(cycle_number),
            float(steam_volume_t),
            float(steam_pressure_mpa),
            float(soak_days),
            float(d),
            float(temp_c),
            float(visc),
            float(q_phys),
        ]
        features_matrix.append(row)
        days_list.append(d)
        physics_rates.append(q_phys)
        temperatures.append(temp_c)
        viscosities.append(visc)

    # Predict residuals with ML layer
    x = np.array(features_matrix, dtype=np.float64)
    predicted_residuals = model.predict(x)

    for q_phys, r in zip(physics_rates, predicted_residuals, strict=True):
        # Hybrid is physics baseline + residual, clamped non-negative
        q_hyb = max(0.0, round(float(q_phys + r), 2))
        hybrid_rates.append(q_hyb)

    cum_phys = round(float(sum(physics_rates)), 1)
    cum_hyb = round(float(sum(hybrid_rates)), 1)

    return {
        "days": days_list,
        "physics_rates": [round(r, 2) for r in physics_rates],
        "hybrid_rates": hybrid_rates,
        "temperatures": [round(t, 2) for t in temperatures],
        "viscosities": [round(v, 2) for v in viscosities],
        "cumulative_oil_physics_bbl": cum_phys,
        "cumulative_oil_hybrid_bbl": cum_hyb,
    }

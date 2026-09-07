"""Unit tests for the Hybrid CSS Production-Response Model."""

from pathlib import Path

from app.ml.production_model import (
    DEFAULT_MODEL_PATH,
    forecast_production_cycle,
    load_production_model,
    physics_daily_oil_forecast,
)


def test_production_model_artifact_exists_and_loads():
    """Verify saved production model artifact exists and contains metrics."""
    assert Path(
        DEFAULT_MODEL_PATH
    ).exists(), f"Production model artifact not found at {DEFAULT_MODEL_PATH}"
    bundle = load_production_model(DEFAULT_MODEL_PATH)
    assert "model" in bundle
    assert "metrics" in bundle
    assert "feature_columns" in bundle


def test_hybrid_model_beats_physics_alone_on_held_out_wells():
    """Assert hybrid model achieves strictly lower MAE and RMSE than physics-alone."""
    bundle = load_production_model(DEFAULT_MODEL_PATH)
    metrics = bundle["metrics"]

    phys_mae = metrics["physics_mae"]
    phys_rmse = metrics["physics_rmse"]
    hyb_mae = metrics["hybrid_mae"]
    hyb_rmse = metrics["hybrid_rmse"]

    assert (
        hyb_rmse < phys_rmse
    ), f"Hybrid RMSE ({hyb_rmse}) must be lower than physics-alone ({phys_rmse})"
    assert (
        hyb_mae < phys_mae
    ), f"Hybrid MAE ({hyb_mae}) must be lower than physics-alone ({phys_mae})"
    assert metrics["beats_physics"] is True

    # Assert by-well split was used
    assert metrics["train_wells"] == [
        "WELL-001",
        "WELL-002",
        "WELL-003",
        "WELL-004",
        "WELL-005",
        "WELL-006",
    ]
    assert metrics["test_wells"] == ["WELL-007", "WELL-008"]


def test_forecast_production_cycle_contract():
    """Verify forecast returns full time-series with valid physical bounds."""
    forecast = forecast_production_cycle(
        cycle_number=2,
        steam_volume_t=2500.0,
        steam_pressure_mpa=11.5,
        soak_days=4,
        prod_days=60,
    )

    assert len(forecast["days"]) == 60
    assert len(forecast["physics_rates"]) == 60
    assert len(forecast["hybrid_rates"]) == 60
    assert len(forecast["temperatures"]) == 60
    assert len(forecast["viscosities"]) == 60

    # Rates must be non-negative
    for r in forecast["hybrid_rates"]:
        assert r >= 0.0

    # Cumulative oil must be positive
    assert forecast["cumulative_oil_hybrid_bbl"] > 0.0
    assert forecast["cumulative_oil_physics_bbl"] > 0.0


def test_physics_forecast_volume_sensitivity():
    """Verify higher steam volume produces higher peak temperature and sustained rate."""
    q_low, temp_low, _ = physics_daily_oil_forecast(
        cycle_number=1,
        steam_volume_t=1500.0,
        steam_pressure_mpa=10.0,
        soak_days=3,
        day_in_cycle=10,
    )
    q_high, temp_high, _ = physics_daily_oil_forecast(
        cycle_number=1,
        steam_volume_t=3500.0,
        steam_pressure_mpa=12.0,
        soak_days=4,
        day_in_cycle=10,
    )

    assert temp_high > temp_low
    assert q_high >= q_low

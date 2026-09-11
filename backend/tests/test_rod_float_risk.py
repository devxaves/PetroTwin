"""Unit tests for continuous explainable rod-float risk scoring engine."""

from app.ml.rod_float_risk import (
    WEIGHTS,
    calculate_rod_float_risk,
)


def test_rod_float_risk_monotonicity_variance():
    """Verify increasing downstroke variance monotonically increases risk."""
    prev_risk = -1.0
    for var in [0.0, 50000.0, 200000.0, 800000.0, 1500000.0, 3000000.0]:
        res = calculate_rod_float_risk(
            min_load=7000.0,
            downstroke_load_variance=var,
            load_derivative_max=50.0,
            spm=6.0,
            viscosity_cp=500.0,
            pump_fillage=0.85,
        )
        current_risk = res["risk_score"]
        assert (
            current_risk >= prev_risk
        ), f"Monotonicity violated: var={var}, prev={prev_risk}, curr={current_risk}"
        prev_risk = current_risk


def test_rod_float_risk_monotonicity_load_spikes():
    """Verify that increasing load derivative spike monotonically increases risk."""
    prev_risk = -1.0
    for spike in [0.0, 50.0, 150.0, 300.0, 500.0, 1000.0]:
        res = calculate_rod_float_risk(
            min_load=6500.0,
            downstroke_load_variance=100000.0,
            load_derivative_max=spike,
            spm=7.0,
            viscosity_cp=1000.0,
            pump_fillage=0.80,
        )
        current_risk = res["risk_score"]
        msg = f"Monotonicity violated: spike={spike}, prev={prev_risk}, curr={current_risk}"
        assert current_risk >= prev_risk, msg
        prev_risk = current_risk


def test_rod_float_risk_monotonicity_viscosity():
    """Verify that cooling/higher viscosity strictly increases risk."""
    prev_risk = -1.0
    # From hot (low viscosity) to cold (extreme heavy oil viscosity)
    for visc in [50.0, 200.0, 1000.0, 3000.0, 8000.0, 20000.0]:
        res = calculate_rod_float_risk(
            min_load=6500.0,
            downstroke_load_variance=100000.0,
            load_derivative_max=50.0,
            spm=7.0,
            viscosity_cp=visc,
            pump_fillage=0.80,
        )
        current_risk = res["risk_score"]
        assert (
            current_risk >= prev_risk
        ), f"Monotonicity violated: visc={visc}, prev={prev_risk}, curr={current_risk}"
        prev_risk = current_risk


def test_rod_float_risk_monotonicity_min_load_depression():
    """Verify that declining minimum load (rod float compression) increases risk."""
    prev_risk = -1.0
    # min_load dropping from nominal 7500 down to 3500 lbf
    for m_load in [7500.0, 7000.0, 6000.0, 5000.0, 4000.0, 3000.0]:
        res = calculate_rod_float_risk(
            min_load=m_load,
            downstroke_load_variance=100000.0,
            load_derivative_max=50.0,
            spm=7.0,
            viscosity_cp=1000.0,
            pump_fillage=0.80,
        )
        current_risk = res["risk_score"]
        msg = f"Monotonicity violated: min_load={m_load}, prev={prev_risk}, curr={current_risk}"
        assert current_risk >= prev_risk, msg
        prev_risk = current_risk


def test_rod_float_risk_bounds_and_breakdown():
    """Verify bounded [0, 100] output and complete explainability breakdown."""
    # Best case operating condition
    best = calculate_rod_float_risk(
        min_load=7500.0,
        downstroke_load_variance=0.0,
        load_derivative_max=0.0,
        spm=4.0,
        viscosity_cp=50.0,
        pump_fillage=1.0,
    )
    assert best["risk_score"] == 0.0
    assert best["risk_level"] == "LOW"
    assert best["recommendation"]["action"] == "MAINTAIN_PARAMETERS"

    # Worst case operating condition
    worst = calculate_rod_float_risk(
        min_load=3000.0,
        downstroke_load_variance=3000000.0,
        load_derivative_max=800.0,
        spm=12.0,
        viscosity_cp=20000.0,
        pump_fillage=0.0,
    )
    assert worst["risk_score"] == 100.0
    assert worst["risk_level"] == "HIGH"
    assert worst["recommendation"]["action"] == "REDUCE_SPM"
    assert worst["recommendation"]["target_spm"] < 12.0

    # Verify explainability factor keys and weight sum
    assert set(worst["factor_breakdown"].keys()) == set(WEIGHTS.keys())
    total_contribution = sum(
        f["weighted_contribution"] for f in worst["factor_breakdown"].values()
    )
    assert round(total_contribution, 1) == 100.0

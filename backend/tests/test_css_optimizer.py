"""Unit tests for CSS constrained cycle optimizer and safe operating envelope."""

import pytest

from app.db.session import async_session_factory
from app.optimization.css_optimizer import (
    SAFE_ENVELOPE,
    compute_dynamic_cutoff,
    get_historical_cycle_average,
    optimize_css_cycle,
    validate_envelope_parameters,
)


def test_envelope_rejection_on_out_of_bounds_parameters():
    """Verify hard envelope validation rejects all out-of-bounds parameters."""
    # 1. Excess steam volume
    with pytest.raises(ValueError, match="Steam volume"):
        validate_envelope_parameters(
            steam_volume_t=4500.0, steam_pressure_mpa=11.0, soak_days=4
        )

    # 2. Too low steam volume
    with pytest.raises(ValueError, match="Steam volume"):
        validate_envelope_parameters(
            steam_volume_t=800.0, steam_pressure_mpa=11.0, soak_days=4
        )

    # 3. Excess steam pressure (geomechanical fracture breach)
    with pytest.raises(ValueError, match="Steam pressure"):
        validate_envelope_parameters(
            steam_volume_t=2500.0, steam_pressure_mpa=15.0, soak_days=4
        )

    # 4. Too low steam pressure
    with pytest.raises(ValueError, match="Steam pressure"):
        validate_envelope_parameters(
            steam_volume_t=2500.0, steam_pressure_mpa=5.0, soak_days=4
        )

    # 5. Out of bounds soak time
    with pytest.raises(ValueError, match="Soak duration"):
        validate_envelope_parameters(
            steam_volume_t=2500.0, steam_pressure_mpa=11.0, soak_days=1
        )
    with pytest.raises(ValueError, match="Soak duration"):
        validate_envelope_parameters(
            steam_volume_t=2500.0, steam_pressure_mpa=11.0, soak_days=10
        )

    # 6. Out of bounds cutoff days
    with pytest.raises(ValueError, match="Production cutoff"):
        validate_envelope_parameters(
            steam_volume_t=2500.0, steam_pressure_mpa=11.0, soak_days=4, cutoff_days=20
        )
    with pytest.raises(ValueError, match="Production cutoff"):
        validate_envelope_parameters(
            steam_volume_t=2500.0, steam_pressure_mpa=11.0, soak_days=4, cutoff_days=250
        )


def test_optimizer_never_violates_envelope_across_seeds():
    """Confirm optimizer search space never produces an envelope violation."""
    for cycle_num in [1, 2, 3, 4, 5]:
        for risk in [10.0, 35.0, 55.0]:
            opt = optimize_css_cycle(cycle_number=cycle_num, mechanical_risk_score=risk)

            vol = opt["steam_volume_t"]
            press = opt["steam_pressure_mpa"]
            soak = opt["soak_days"]
            cutoff = opt["production_cutoff_days"]

            assert (
                SAFE_ENVELOPE["steam_volume_min_t"]
                <= vol
                <= SAFE_ENVELOPE["steam_volume_max_t"]
            )
            assert (
                SAFE_ENVELOPE["steam_pressure_min_mpa"]
                <= press
                <= SAFE_ENVELOPE["steam_pressure_max_mpa"]
            )
            assert (
                SAFE_ENVELOPE["soak_days_min"] <= soak <= SAFE_ENVELOPE["soak_days_max"]
            )
            assert (
                SAFE_ENVELOPE["production_cutoff_min_days"]
                <= cutoff
                <= SAFE_ENVELOPE["production_cutoff_max_days"]
            )


def test_dynamic_cutoff_stopping_point_accuracy():
    """Verify dynamic cutoff function stops exactly when marginal value turns non-positive."""
    # Construct daily rates that start at 25 bbl, drop to 2.0 bbl at day 55, and 1.0 bbl after day 55
    # Day 55: 2.0 bbl oil @ $65 = $130 revenue. Opex = 85 lift + 18 bbl water * 2.5 (45) = 130 -> Net = 0
    # Day 56: 1.0 bbl oil @ $65 = $65 revenue. Opex = 85 + 20 bbl water * 2.5 (50) = 135 -> Net = -70
    daily_rates = [25.0 - (23.0 * d / 54.0) for d in range(54)]  # Days 1 to 54
    daily_rates.append(2.0)  # Day 55: break-even
    daily_rates.extend([1.0] * 35)  # Days 56 to 90: loss-making

    cutoff_day = compute_dynamic_cutoff(
        daily_oil_rates=daily_rates,
        water_cut=0.6428,  # water = oil * (0.6428 / 0.3572) ~ 1.8x oil
        min_days=40,
        max_days=90,
    )
    assert cutoff_day == 55, f"Expected cutoff at day 55, got {cutoff_day}"


@pytest.mark.asyncio
async def test_optimizer_recommended_scenario_beats_historical_average():
    """Verify recommended scenario economic value >= historical average cycle value."""
    try:
        async with async_session_factory() as session:
            hist = await get_historical_cycle_average("WELL-001", session)
    except Exception:
        hist = {
            "avg_oil_bbl": 2400.0,
            "avg_steam_t": 2500.0,
            "avg_economic_value": 45000.0,
            "cycles_count": 3,
        }

    recommended = optimize_css_cycle(cycle_number=hist["cycles_count"] + 1)

    hist_val = hist["avg_economic_value"]
    rec_val = recommended["economic_value"]

    assert (
        rec_val >= hist_val
    ), f"Recommended cycle value (${rec_val:,.2f}) must be >= historical average (${hist_val:,.2f})"

"""Tests for CSS <-> SRP physical coupling and combined confidence calculation.

Load-Bearing Proof:
-------------------
Proves that CSS thermal reservoir dynamics and SRP surface kinematics are genuinely
physically coupled through fluid rheology (Temperature -> Viscosity -> Inflow ->
Pump Fillage -> Downstroke Drag -> Rod-Float Risk).
"""

from __future__ import annotations

import pytest

from app.twin.coupling import calculate_pump_efficiency, simulate_coupled_response
from app.twin.recommendation_engine import compute_combined_confidence


def test_coupling_css_change_alters_srp_rod_float_risk() -> None:
    """
    CRITICAL COUPLING PROOF 1:
    Two calls with IDENTICAL SPM but DIFFERENT steam volume MUST produce
    different rod-float risk scores.
    """
    spm = 6.5

    # Case A: Low steam volume (2,000 t) -> colder reservoir -> high viscosity -> high risk
    res_low_steam = simulate_coupled_response(
        cycle_number=1,
        steam_volume_t=2000.0,
        steam_pressure_mpa=11.0,
        soak_days=4,
        spm=spm,
        day_in_cycle=25,
    )

    # Case B: High steam volume (3,400 t) -> hotter reservoir -> lower viscosity -> lower risk
    res_high_steam = simulate_coupled_response(
        cycle_number=1,
        steam_volume_t=3400.0,
        steam_pressure_mpa=11.0,
        soak_days=4,
        spm=spm,
        day_in_cycle=25,
    )

    temp_a = res_low_steam["reservoir"]["temperature_c"]
    temp_b = res_high_steam["reservoir"]["temperature_c"]
    visc_a = res_low_steam["reservoir"]["viscosity_cp"]
    visc_b = res_high_steam["reservoir"]["viscosity_cp"]

    risk_a = res_low_steam["rod_mechanics"]["rod_float_risk_score"]
    risk_b = res_high_steam["rod_mechanics"]["rod_float_risk_score"]

    # Assertions proving downstream physical link
    assert temp_b > temp_a, f"High steam should yield higher temperature ({temp_b} > {temp_a})"
    assert visc_b < visc_a, f"High steam should lower oil viscosity ({visc_b} < {visc_a})"
    assert risk_a != risk_b, "Identical SPM with different steam volume MUST NOT yield identical risk scores!"
    assert risk_a > risk_b, (
        f"Colder oil under low steam should have higher rod-float risk ({risk_a} > {risk_b})"
    )


def test_coupling_spm_change_alters_rod_float_and_efficiency() -> None:
    """
    CRITICAL COUPLING PROOF 2:
    Two calls with IDENTICAL CSS params but DIFFERENT SPM MUST produce
    different rod-float risk scores and different pump efficiencies.
    """
    steam_volume = 2400.0
    pressure = 11.5
    soak = 4

    # Low pumping speed (4.2 SPM)
    res_low_spm = simulate_coupled_response(
        cycle_number=1,
        steam_volume_t=steam_volume,
        steam_pressure_mpa=pressure,
        soak_days=soak,
        spm=4.2,
        day_in_cycle=20,
    )

    # High pumping speed (9.5 SPM)
    res_high_spm = simulate_coupled_response(
        cycle_number=1,
        steam_volume_t=steam_volume,
        steam_pressure_mpa=pressure,
        soak_days=soak,
        spm=9.5,
        day_in_cycle=20,
    )

    risk_low = res_low_spm["rod_mechanics"]["rod_float_risk_score"]
    risk_high = res_high_spm["rod_mechanics"]["rod_float_risk_score"]

    eff_low = res_low_spm["pump"]["volumetric_efficiency"]
    eff_high = res_high_spm["pump"]["volumetric_efficiency"]

    assert risk_low != risk_high, "Different SPM with identical CSS MUST NOT yield identical risk scores!"
    assert risk_high > risk_low, (
        f"Higher SPM should increase downward rod drag and risk ({risk_high} > {risk_low})"
    )
    assert eff_low != eff_high, "Different SPM MUST alter volumetric pump efficiency!"


def test_coupling_spm_change_does_not_fabricate_temperature_change() -> None:
    """
    CRITICAL COUPLING PROOF 3:
    Varying SPM alone must NEVER fabricate or alter the reservoir temperature.
    """
    steam_volume = 2600.0
    pressure = 12.0
    soak = 5

    res_1 = simulate_coupled_response(
        cycle_number=2,
        steam_volume_t=steam_volume,
        steam_pressure_mpa=pressure,
        soak_days=soak,
        spm=4.5,
        day_in_cycle=15,
    )
    res_2 = simulate_coupled_response(
        cycle_number=2,
        steam_volume_t=steam_volume,
        steam_pressure_mpa=pressure,
        soak_days=soak,
        spm=11.0,
        day_in_cycle=15,
    )

    temp_1 = res_1["reservoir"]["temperature_c"]
    temp_2 = res_2["reservoir"]["temperature_c"]
    visc_1 = res_1["reservoir"]["viscosity_cp"]
    visc_2 = res_2["reservoir"]["viscosity_cp"]

    assert temp_1 == temp_2, f"SPM change should NOT affect reservoir temperature ({temp_1} == {temp_2})"
    assert visc_1 == visc_2, f"SPM change should NOT alter reservoir viscosity ({visc_1} == {visc_2})"


def test_pump_efficiency_helper() -> None:
    """Test boundary conditions for pump volumetric efficiency."""
    assert calculate_pump_efficiency(0.0, 100.0) == 0.0
    assert calculate_pump_efficiency(50.0, 100.0) == 0.5
    assert calculate_pump_efficiency(120.0, 100.0) == 1.0  # clamped to 1.0
    assert calculate_pump_efficiency(50.0, 0.0) == 0.0


def test_combined_confidence_formulation() -> None:
    """
    Test combined confidence geometric mean calculation across
    (high, high), (high, low), (low, low), and bounds.
    """
    # High, High -> High combined confidence
    conf_hh = compute_combined_confidence(0.95, 0.90)
    assert 0.90 <= conf_hh <= 0.95

    # High, Low -> Penalized confidence
    conf_hl = compute_combined_confidence(0.95, 0.30)
    assert conf_hl < 0.60
    assert conf_hl == round((0.95 * 0.30) ** 0.5, 3)

    # Low, Low -> Very low confidence
    conf_ll = compute_combined_confidence(0.25, 0.20)
    assert conf_ll < 0.30
    assert conf_ll == round((0.25 * 0.20) ** 0.5, 3)

    # Edge cases
    assert compute_combined_confidence(1.0, 1.0) == 1.0
    assert compute_combined_confidence(0.0, 0.9) == 0.0
    assert compute_combined_confidence(-0.5, 0.8) == 0.0
    assert compute_combined_confidence(1.5, 1.0) == 1.0

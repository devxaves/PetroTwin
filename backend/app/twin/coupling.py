"""Coupling logic connecting CSS thermal dynamics with SRP sucker rod pump kinematics.

Why this matters:
-----------------
In heavy oil thermal production, CSS (reservoir heating) and SRP (surface pumping)
are physically coupled through the fluid properties:
  1. CSS Injection: Steam volume & pressure determine the reservoir thermal trajectory T(t).
  2. Arrhenius Rheology: Fluid temperature T(t) directly sets oil viscosity mu(t).
  3. Darcy Inflow & Pump Dynamics: Viscosity sets formation inflow into the wellbore,
     which dictates downhole pump barrel fillage.
  4. SRP Rod Mechanics: Viscosity and pumping speed (SPM) dictate Stokes drag on the downstroke:
       F_drag = 6 * pi * mu * r_rod * v_downstroke
     High viscosity or high downward rod velocity induces rod float (compressive rod loading,
     loss of tension, buckling, and fatigue parting).

This module computes this complete downstream chain:
  CSS params -> T(t) -> mu(t) -> Inflow -> Pump Fillage -> Rod-Float Risk & SPM Adjustment.
Conversely, changing SPM recomputes rod velocity, pump fillage, and pump volumetric efficiency,
while strictly leaving the thermal reservoir state unmanipulated (no fabricated temperature change).
"""

from __future__ import annotations

from typing import Any

from app.ml.production_model import physics_daily_oil_forecast
from app.ml.rod_float_risk import (
    DEFAULT_HISTORICAL_MIN_LOAD,
    calculate_rod_float_risk,
    get_recommended_adjustment,
)
from app.simulation.inflow_and_pump_model import (
    inflow_rate,
    oil_production_rate,
    pump_fillage,
)


def calculate_pump_efficiency(
    inflow_bpd: float,
    theoretical_disp_bpd: float,
) -> float:
    """
    Calculate pump volumetric efficiency fraction [0.0, 1.0].

    Equivalent to downhole pump barrel fillage ratio.
    """
    if theoretical_disp_bpd <= 0:
        return 0.0
    return float(max(0.0, min(1.0, inflow_bpd / theoretical_disp_bpd)))


def simulate_coupled_response(
    cycle_number: int,
    steam_volume_t: float,
    steam_pressure_mpa: float,
    soak_days: int | float,
    spm: float,
    stroke_length_in: float = 120.0,
    day_in_cycle: int = 20,
    t_base_c: float = 45.0,
    min_load_lbf: float = 6800.0,
    downstroke_variance: float = 350000.0,
    load_derivative_max: float = 120.0,
    baseline_min_load: float = DEFAULT_HISTORICAL_MIN_LOAD,
    res_pressure_psi: float = 1250.0,
    pwf_psi: float = 300.0,
) -> dict[str, Any]:
    """
    Simulate the full coupled physical response between CSS and SRP.

    Computes downstream chain:
      (steam_volume, steam_pressure, soak_days)
        -> Temperature T(t)
        -> Viscosity mu(T)
        -> Formation Inflow q(mu)
        -> Pump Displacement & Fillage
        -> Downstroke Viscous Drag & Rod Float Risk
        -> Recommended SPM Adjustment

    When SPM is varied with identical CSS parameters, the temperature trajectory
    is strictly invariant (physics-faithful), but pump fillage, pump efficiency,
    and rod-float risk respond directly.
    """
    # 1. Evaluate first-principles physical forecast for the specific cycle day
    phys_oil_bopd, temp_c, visc_cp = physics_daily_oil_forecast(
        cycle_number=cycle_number,
        steam_volume_t=steam_volume_t,
        steam_pressure_mpa=steam_pressure_mpa,
        soak_days=soak_days,
        day_in_cycle=day_in_cycle,
        t_base_c=t_base_c,
        stroke_length_in=stroke_length_in,
        spm=spm,
        res_pressure_psi=res_pressure_psi,
        pwf_psi=pwf_psi,
    )

    # 2. Formation Inflow & Theoretical Pump Displacement
    cycle_prog = min(1.0, day_in_cycle / 120.0)
    p_res = res_pressure_psi * (1.0 - 0.20 * cycle_prog)
    formation_inflow_bpd = inflow_rate(p_res, pwf_psi, visc_cp)

    bbl_per_stroke = (stroke_length_in * 3.14159) / 9702.0
    theoretical_disp_bpd = bbl_per_stroke * spm * 1440.0
    fillage = pump_fillage(formation_inflow_bpd, theoretical_disp_bpd)
    actual_oil_bopd = oil_production_rate(fillage, spm, stroke_length_in)
    efficiency = calculate_pump_efficiency(formation_inflow_bpd, theoretical_disp_bpd)

    # 3. Dynamic adjustment of minimum downstroke load due to Stokes drag
    # Dynamic viscous drag on rod string: F_drag ~ mu * v_rod
    # Reference downstroke velocity at 8 SPM and 120 in stroke: v_ref = 1.0 (normalized)
    v_norm = (spm * stroke_length_in) / (8.0 * 120.0)
    visc_ratio = visc_cp / 1500.0  # reference 1500 cP
    stokes_drag_drag_penalty = 600.0 * (visc_ratio * v_norm - 1.0)
    effective_min_load = max(1000.0, min_load_lbf - max(0.0, stokes_drag_drag_penalty))

    # 4. Prompt 3 Rod Float Risk Calculation
    rod_float_assessment = calculate_rod_float_risk(
        min_load=effective_min_load,
        downstroke_load_variance=downstroke_variance,
        load_derivative_max=load_derivative_max,
        spm=spm,
        temperature_c=temp_c,
        viscosity_cp=visc_cp,
        pump_fillage=fillage,
        baseline_min_load=baseline_min_load,
    )

    # 5. Downstream Recommended Adjustment
    recommended_srp = get_recommended_adjustment(
        risk_score=float(rod_float_assessment["risk_score"]),
        current_spm=spm,
    )

    return {
        "inputs": {
            "cycle_number": cycle_number,
            "steam_volume_t": steam_volume_t,
            "steam_pressure_mpa": steam_pressure_mpa,
            "soak_days": soak_days,
            "spm": spm,
            "stroke_length_in": stroke_length_in,
            "day_in_cycle": day_in_cycle,
        },
        "reservoir": {
            "temperature_c": round(temp_c, 2),
            "viscosity_cp": round(visc_cp, 2),
            "formation_inflow_bpd": round(formation_inflow_bpd, 2),
        },
        "pump": {
            "theoretical_displacement_bpd": round(theoretical_disp_bpd, 2),
            "pump_fillage": round(fillage, 4),
            "volumetric_efficiency": round(efficiency, 4),
            "actual_oil_bopd": round(actual_oil_bopd, 2),
        },
        "rod_mechanics": {
            "effective_min_load_lbf": round(effective_min_load, 1),
            "rod_float_risk_score": float(rod_float_assessment["risk_score"]),
            "rod_float_risk_level": str(rod_float_assessment["risk_level"]),
            "factor_breakdown": rod_float_assessment["factor_breakdown"],
            "recommended_adjustment": recommended_srp,
        },
    }

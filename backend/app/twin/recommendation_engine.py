"""Combined Recommendation Engine & Explainability for PetroTwin.

Synthesizes reservoir thermal optimization (Prompt 4) with SRP mechanical diagnostics
and rod-float risk mitigation (Prompt 3) into an actionable, explainable joint
operational recommendation requiring operator sign-off.
"""

from __future__ import annotations

import math
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.css_economics import DEFAULT_OIL_PRICE_PER_BBL
from app.optimization.css_optimizer import (
    get_historical_cycle_average,
    optimize_css_cycle,
)
from app.twin.coupling import simulate_coupled_response
from app.twin.joint_state import get_well_twin_state


def compute_combined_confidence(
    css_confidence: float,
    srp_confidence: float,
) -> float:
    """
    Compute joint recommendation confidence as the geometric mean of subsystem confidences.

    Equation:
        C_combined = sqrt(max(0.0, min(1.0, C_css)) * max(0.0, min(1.0, C_srp)))

    Mathematical & Operational Justification:
    -----------------------------------------
    In a physical digital twin, joint decision viability requires both subsystems to be
    trustworthy: the reservoir thermal/economic model AND the mechanical dynamometer
    classification. The geometric mean possesses two essential properties:
      1. Multiplicative sensitivity: A severe deficit in either subsystem's confidence
         (e.g., C_srp = 0.25 on a noisy card) heavily penalizes the joint decision
         (sqrt(0.94 * 0.25) = 0.48), preventing overconfident automated advice when
         one domain is uncertain.
      2. Smoothness and symmetry: Unlike min(C_css, C_srp), the geometric mean is smooth
         and reflects marginal improvements in either subsystem without step-discontinuities.
    """
    c_css = max(0.0, min(1.0, float(css_confidence)))
    c_srp = max(0.0, min(1.0, float(srp_confidence)))
    return round(math.sqrt(c_css * c_srp), 3)


async def generate_joint_recommendation(
    well_id: str,
    session: AsyncSession,
    oil_price: float = DEFAULT_OIL_PRICE_PER_BBL,
) -> dict[str, Any]:
    """
    Generate unified CSS + SRP recommendation with full physical explainability.

    Returns the exact schema specified in Prompt 5:
      - well_id
      - current_state
      - predicted_trajectory
      - recommendation (css, srp, combined_confidence)
      - reasons (explainable human-readable rationales)
      - expected_effect (production_delta_pct, sor_delta_pct, rod_float_risk_delta, energy_delta_pct)
      - requires_operator_approval (always True)
    """
    # 1. Fetch current digital twin state
    twin_state = await get_well_twin_state(well_id=well_id, session=session)
    state_dict = twin_state.model_dump()

    # 2. Run Prompt 4 CSS Optimizer given current mechanical risk
    opt_css = optimize_css_cycle(
        cycle_number=twin_state.cycle_number,
        mechanical_risk_score=twin_state.rod_float_risk_score,
        oil_price=oil_price,
    )

    # 3. Simulate coupled response with optimized CSS parameters to forecast updated rod-float risk
    coupled_sim = simulate_coupled_response(
        cycle_number=twin_state.cycle_number,
        steam_volume_t=opt_css["steam_volume_t"],
        steam_pressure_mpa=opt_css["steam_pressure_mpa"],
        soak_days=opt_css["soak_days"],
        spm=twin_state.current_spm,
        stroke_length_in=twin_state.stroke_length_in,
        day_in_cycle=20,
    )

    recommended_srp = coupled_sim["rod_mechanics"]["recommended_adjustment"]
    coupled_risk_score = coupled_sim["rod_mechanics"]["rod_float_risk_score"]

    # 4. Joint confidence calculation
    css_conf = float(opt_css.get("confidence", 0.94))
    srp_conf = float(twin_state.dynamometer_confidence)
    combined_conf = compute_combined_confidence(css_conf, srp_conf)

    # 5. Fetch historical cycle average to compute relative expected effects
    hist_avg = await get_historical_cycle_average(well_id=well_id, session=session, oil_price=oil_price)

    hist_oil = max(hist_avg.get("avg_oil_bbl", 2000.0), 100.0)
    rec_oil = float(opt_css.get("predicted_oil_bbl", 2500.0))
    prod_delta_pct = round(((rec_oil - hist_oil) / hist_oil) * 100.0, 1)

    hist_sor = max(hist_avg.get("avg_sor", 3.0), 0.5)
    rec_sor = float(opt_css.get("sor", 2.5))
    sor_delta_pct = round(((rec_sor - hist_sor) / hist_sor) * 100.0, 1)

    # Energy delta compared to typical benchmark
    energy_delta_pct = round(((opt_css["energy_cost_per_bbl"] - 22.0) / 22.0) * 100.0, 1)

    risk_delta = round(coupled_risk_score - twin_state.rod_float_risk_score, 1)

    # 6. Generate explainable reasons
    reasons: list[str] = []

    # Fluid & thermal reasons
    if twin_state.current_viscosity_cp > 2500.0:
        reasons.append(
            f"Viscosity is elevated at {twin_state.current_viscosity_cp:.0f} cP due to cooling "
            f"({twin_state.current_temperature_c:.1f}°C), restricting Darcy inflow."
        )
    else:
        reasons.append(
            f"Current reservoir temperature is {twin_state.current_temperature_c:.1f}°C "
            f"(viscosity {twin_state.current_viscosity_cp:.0f} cP)."
        )

    # Pump fillage reasons
    if twin_state.pump_fillage < 0.70:
        reasons.append(
            f"Pump fillage is {twin_state.pump_fillage * 100:.1f}%, indicating incomplete barrel filling "
            f"and fluid pound vulnerability."
        )
    else:
        reasons.append(f"Pump fillage is healthy at {twin_state.pump_fillage * 100:.1f}%.")

    # Rod float reasons
    if twin_state.rod_float_risk_score >= 60.0:
        reasons.append(
            f"High rod-float risk ({twin_state.rod_float_risk_score:.1f}/100) detected: "
            f"{recommended_srp.get('rule', 'Reduce SPM')}."
        )
    elif twin_state.rod_float_risk_score >= 30.0:
        reasons.append(
            f"Moderate rod-float risk ({twin_state.rod_float_risk_score:.1f}/100): "
            f"recommend adjusting SPM from {twin_state.current_spm:.1f} to {recommended_srp.get('target_spm', twin_state.current_spm):.1f}."
        )
    else:
        reasons.append(
            f"Rod string mechanics operating safely within hydrodynamic envelope (risk {twin_state.rod_float_risk_score:.1f}/100)."
        )

    # CSS thermal stimulation reason
    reasons.append(
        f"Optimized CSS injection of {opt_css['steam_volume_t']:.0f}t steam at "
        f"{opt_css['steam_pressure_mpa']:.1f} MPa ({opt_css['soak_days']} soak days) "
        f"maximizes net economic margin to ${opt_css['economic_value']:,.0f}."
    )

    return {
        "well_id": well_id,
        "current_state": state_dict,
        "predicted_trajectory": state_dict["predicted_production_trajectory"],
        "recommendation": {
            "css": opt_css,
            "srp": recommended_srp,
            "combined_confidence": combined_conf,
        },
        "reasons": reasons,
        "expected_effect": {
            "production_delta_pct": prod_delta_pct,
            "sor_delta_pct": sor_delta_pct,
            "rod_float_risk_delta": risk_delta,
            "energy_delta_pct": energy_delta_pct,
        },
        "requires_operator_approval": True,
    }

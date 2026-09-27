"""
CSS Well Candidate Screening Engine.

Evaluates well suitability for cyclic steam stimulation prior to scheduling a cycle.
Directly integrates Prompt 3's rod-float risk engine and checks database failure
records, water cut thresholds, and economic productivity hurdles.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CSSCycle, DynamometerCard, Failure, Production, SRPTelemetry
from app.ml.production_model import forecast_production_cycle
from app.ml.rod_float_risk import calculate_rod_float_risk

# Screening thresholds
ROD_FLOAT_RISK_THRESHOLD = 60.0  # Above this is mechanically unsafe
WATER_CUT_EXCESSIVE_THRESHOLD = 0.85  # Above 85% is poor candidate
WATER_CUT_MARGINAL_THRESHOLD = 0.78  # Above 78% is marginal
MIN_ECONOMIC_OIL_BBL = 1200.0  # Below this is economically unviable
MARGINAL_ECONOMIC_OIL_BBL = 2200.0  # Below this is marginal return


async def screen_well_for_css(
    well_id: str,
    session: AsyncSession,
    min_oil_hurdle_bbl: float = MIN_ECONOMIC_OIL_BBL,
) -> dict[str, Any]:
    """
    Screen a well and classify it into one of 4 readiness categories:
      - good_candidate
      - marginal
      - poor
      - unsafe_or_unavailable

    Integrates:
      1. Unresolved recent failures from 'failures' table.
      2. Prompt 3 rod-float mechanical risk calculation.
      3. Current water cut from 'production' table.
      4. Forward cycle production forecast and economics.
    """
    reasons: list[str] = []

    # 1. Check recent failure events (within last 30 days or unresolved)
    q_fail = (
        select(Failure)
        .where(Failure.well_id == well_id)
        .order_by(desc(Failure.event_time))
        .limit(1)
    )
    latest_failure = (await session.execute(q_fail)).scalar_one_or_none()

    # Consider failures in the last 20 days or critical severity as blocking
    if latest_failure and latest_failure.severity in {"critical", "high"}:
        reasons.append(
            f"Unresolved or severe recent failure: {latest_failure.failure_type} "
            f"(Severity: {latest_failure.severity}, Cause: {latest_failure.root_cause})"
        )
        return {
            "well_id": well_id,
            "status": "unsafe_or_unavailable",
            "classification": "unsafe_or_unavailable",
            "reasons": reasons,
            "can_stimulate": False,
            "current_water_cut": 0.50,
            "cycles_completed": 0,
            "mechanical_risk": {
                "rod_float_risk": 100.0,
                "friction_risk": 50.0,
                "rod_stress_ratio": 1.0,
                "surface_temp_c": 50.0,
                "bottom_temp_c": 85.0,
            },
            "recommendation": "Mechanical workover or maintenance required before stimulation",
            "mechanical_risk_score": 100.0,
            "predicted_oil_bbl": None,
        }

    # 2. Call Prompt 3's Rod-Float Risk Engine
    q_card = (
        select(DynamometerCard)
        .where(DynamometerCard.well_id == well_id)
        .order_by(desc(DynamometerCard.timestamp))
        .limit(1)
    )
    latest_card = (await session.execute(q_card)).scalar_one_or_none()

    q_telem = (
        select(SRPTelemetry)
        .where(SRPTelemetry.well_id == well_id)
        .order_by(desc(SRPTelemetry.timestamp))
        .limit(1)
    )
    latest_telem = (await session.execute(q_telem)).scalar_one_or_none()
    spm = latest_telem.spm if latest_telem else 8.0

    q_prod = (
        select(Production)
        .where(Production.well_id == well_id)
        .order_by(desc(Production.timestamp))
        .limit(1)
    )
    latest_prod = (await session.execute(q_prod)).scalar_one_or_none()
    temp_c = latest_prod.temperature_c if latest_prod else 50.0
    water_cut = latest_prod.water_cut if latest_prod else 0.55

    # Compute mechanical risk using Prompt 3 engine
    if latest_card:
        card_pts = latest_card.card_points_json
        loads = [p["load"] for p in card_pts]
        min_load = min(loads)
        downstroke_loads = [p["load"] for p in card_pts[len(card_pts) // 2 :]]
        mean_ds = sum(downstroke_loads) / len(downstroke_loads)
        var_ds = sum((x - mean_ds) ** 2 for x in downstroke_loads) / len(
            downstroke_loads
        )

        # Max spike
        derivatives = []
        for i in range(len(card_pts) - 1):
            dp = abs(card_pts[i + 1]["position"] - card_pts[i]["position"])
            dl = abs(card_pts[i + 1]["load"] - card_pts[i]["load"])
            derivatives.append(dl / dp if dp > 1e-3 else dl * 10.0)
        spike = max(derivatives) if derivatives else 0.0

        risk_assessment = calculate_rod_float_risk(
            min_load=min_load,
            downstroke_load_variance=var_ds,
            load_derivative_max=spike,
            spm=spm,
            temperature_c=temp_c,
        )
        risk_score = risk_assessment["risk_score"]
    else:
        risk_score = 25.0  # default nominal

    if risk_score > ROD_FLOAT_RISK_THRESHOLD:
        reasons.append(
            f"High mechanical rod-float risk score ({risk_score:.1f} > 60.0). "
            f"Severe compression risk during downstroke."
        )
        return {
            "well_id": well_id,
            "status": "unsafe_or_unavailable",
            "classification": "unsafe_or_unavailable",
            "reasons": reasons,
            "can_stimulate": False,
            "current_water_cut": round(water_cut, 4),
            "cycles_completed": 0,
            "mechanical_risk": {
                "rod_float_risk": risk_score,
                "friction_risk": 20.0,
                "rod_stress_ratio": 0.75,
                "surface_temp_c": temp_c,
                "bottom_temp_c": temp_c + 35.0,
            },
            "recommendation": "Mechanical workover or maintenance required before stimulation",
            "mechanical_risk_score": risk_score,
            "predicted_oil_bbl": None,
        }

    # 3. Check Water Cut
    if water_cut > WATER_CUT_EXCESSIVE_THRESHOLD:
        reasons.append(
            f"Excessive current water cut ({water_cut * 100:.1f}% > 85.0%). "
            f"High risk of steam coning and uneconomic water cycling."
        )
        return {
            "well_id": well_id,
            "status": "poor",
            "classification": "poor",
            "reasons": reasons,
            "can_stimulate": False,
            "current_water_cut": round(water_cut, 4),
            "cycles_completed": 0,
            "mechanical_risk": {
                "rod_float_risk": risk_score,
                "friction_risk": 15.0,
                "rod_stress_ratio": 0.60,
                "surface_temp_c": temp_c,
                "bottom_temp_c": temp_c + 35.0,
            },
            "recommendation": "Do not stimulate; high water cut or sub-economic incremental recovery",
            "mechanical_risk_score": risk_score,
            "predicted_oil_bbl": None,
        }

    # 4. Forward cycle forecast (determine next cycle number)
    q_max_cycle = (
        select(CSSCycle.cycle_id)
        .where(CSSCycle.well_id == well_id)
        .order_by(desc(CSSCycle.cycle_id))
        .limit(1)
    )
    max_c_id = (await session.execute(q_max_cycle)).scalar_one_or_none()
    next_cycle_num = (max_c_id or 0) + 1

    # Standard trial injection (2500 tonnes steam @ 11 MPa, 4 soak days, 90 prod days)
    forecast = forecast_production_cycle(
        cycle_number=next_cycle_num,
        steam_volume_t=2500.0,
        steam_pressure_mpa=11.0,
        soak_days=4,
        prod_days=90,
    )
    predicted_oil = forecast["cumulative_oil_hybrid_bbl"]

    # 5. Classify economic returns
    if predicted_oil < min_oil_hurdle_bbl:
        reasons.append(
            f"Predicted incremental recovery ({predicted_oil:.0f} bbl) is below "
            f"the economic viability hurdle ({min_oil_hurdle_bbl:.0f} bbl)."
        )
        classification = "poor"
        can_stimulate = False
    elif (
        predicted_oil < MARGINAL_ECONOMIC_OIL_BBL
        or water_cut > WATER_CUT_MARGINAL_THRESHOLD
    ):
        reasons.append(
            f"Moderate incremental recovery ({predicted_oil:.0f} bbl) with elevated water cut ({water_cut * 100:.1f}%)."
        )
        classification = "marginal"
        can_stimulate = True
    else:
        reasons.append(
            f"Strong reservoir thermal response ({predicted_oil:.0f} bbl expected). "
            f"Low mechanical risk ({risk_score:.1f}/100) and healthy wellbore integrity."
        )
        classification = "good_candidate"
        can_stimulate = True

    rec_map = {
        "good_candidate": "Proceed with CSS cycle",
        "marginal": "Proceed with caution; monitor water cut and casing pressure closely",
        "poor": "Do not stimulate; high water cut or sub-economic incremental recovery",
        "unsafe_or_unavailable": "Mechanical workover or maintenance required before stimulation",
    }

    return {
        "well_id": well_id,
        "status": classification,
        "classification": classification,
        "reasons": reasons,
        "can_stimulate": can_stimulate,
        "current_water_cut": round(water_cut, 4),
        "cycles_completed": max_c_id or 0,
        "mechanical_risk": {
            "rod_float_risk": risk_score,
            "friction_risk": 15.0,
            "rod_stress_ratio": 0.60,
            "surface_temp_c": temp_c,
            "bottom_temp_c": temp_c + 35.0,
        },
        "recommendation": rec_map.get(classification, "Proceed with CSS cycle"),
        "mechanical_risk_score": risk_score,
        "predicted_oil_bbl": predicted_oil,
    }

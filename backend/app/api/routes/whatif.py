"""FastAPI router for What-If Operational Simulation and Pareto Front Analysis.

Allows operators to simulate arbitrary combinations of CSS steam parameters and SRP
pumping speeds, comparing predicted production, Steam-Oil Ratio (SOR), energy intensity,
pump volumetric efficiency, hydrodynamic rod-float risk, and net economic value
against the current operational baseline.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Well
from app.db.session import get_session
from app.ml.css_economics import DEFAULT_OIL_PRICE_PER_BBL
from app.optimization.css_optimizer import (
    SAFE_ENVELOPE,
    evaluate_scenario,
    validate_envelope_parameters,
)
from app.twin.coupling import simulate_coupled_response
from app.twin.joint_state import get_well_twin_state

router = APIRouter(prefix="/wells", tags=["what-if"])


# =============================================================================
# Request & Response Schemas
# =============================================================================


class WhatIfRequest(BaseModel):
    steam_volume: float | None = Field(
        None, description="Proposed steam volume in metric tonnes (1200 - 3800)"
    )
    injection_pressure: float | None = Field(
        None, description="Proposed steam injection pressure in MPa (8.0 - 13.5)"
    )
    soak_time: int | None = Field(
        None, description="Proposed soak duration in days (2 - 7)"
    )
    cutoff_days: int | None = Field(
        None, description="Proposed production cutoff duration in days (40 - 150)"
    )
    spm: float | None = Field(
        None, ge=2.0, le=16.0, description="Proposed pumping speed (SPM) (2.0 - 16.0)"
    )
    stroke_length: float | None = Field(
        None, ge=40.0, le=220.0, description="Proposed polished rod stroke length in inches"
    )
    oil_price: float | None = Field(
        None, gt=0, description="Crude oil price in USD/bbl override"
    )


class ComparisonMetric(BaseModel):
    current: float
    proposed: float
    delta: float
    delta_pct: float | None = None


class WhatIfResponse(BaseModel):
    well_id: str
    scenario_inputs: dict[str, Any]
    comparison: dict[str, Any]
    current_state_summary: dict[str, Any]
    proposed_state_summary: dict[str, Any]
    envelope_validation: dict[str, Any]


class ParetoPoint(BaseModel):
    point_id: int
    steam_volume_t: float
    steam_pressure_mpa: float
    soak_days: int
    production_cutoff_days: int
    cumulative_oil_bbl: float
    sor: float
    economic_value: float
    energy_cost_per_bbl: float
    rod_float_risk_score: float
    objective_weight_oil: float


class ParetoResponse(BaseModel):
    well_id: str
    points_count: int
    pareto_front: list[ParetoPoint]
    optimization_axes: dict[str, str]


# =============================================================================
# Endpoints
# =============================================================================


@router.post(
    "/{well_id}/whatif",
    response_model=WhatIfResponse,
    summary="Simulate what-if operational scenario and compare against baseline",
)
async def simulate_whatif_scenario(
    well_id: str,
    payload: WhatIfRequest,
    session: AsyncSession = Depends(get_session),
) -> WhatIfResponse:
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Well '{well_id}' was not found.",
        )

    # 1. Fetch current digital twin state
    current_twin = await get_well_twin_state(well_id=well_id, session=session)

    # 2. Determine baseline inputs
    cur_steam_vol = 2400.0
    cur_steam_pres = 11.0
    cur_soak_days = 4
    cur_cutoff_days = 60
    cur_spm = current_twin.current_spm
    cur_stroke = current_twin.stroke_length_in
    oil_price = payload.oil_price or DEFAULT_OIL_PRICE_PER_BBL

    # 3. Determine proposed inputs by overriding specified values
    prop_steam_vol = (
        payload.steam_volume if payload.steam_volume is not None else cur_steam_vol
    )
    prop_steam_pres = (
        payload.injection_pressure
        if payload.injection_pressure is not None
        else cur_steam_pres
    )
    prop_soak_days = (
        payload.soak_time if payload.soak_time is not None else cur_soak_days
    )
    prop_cutoff_days = (
        payload.cutoff_days if payload.cutoff_days is not None else cur_cutoff_days
    )
    prop_spm = payload.spm if payload.spm is not None else cur_spm
    prop_stroke = (
        payload.stroke_length if payload.stroke_length is not None else cur_stroke
    )

    # 4. Strict Envelope Validation (Reuses Prompt 4 constraints)
    try:
        validate_envelope_parameters(
            steam_volume_t=prop_steam_vol,
            steam_pressure_mpa=prop_steam_pres,
            soak_days=prop_soak_days,
            cutoff_days=prop_cutoff_days,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Safe Operating Envelope Violation: {exc}",
        ) from exc

    # 5. Evaluate Current Baseline
    cur_css_eval = evaluate_scenario(
        cycle_number=current_twin.cycle_number,
        steam_volume_t=cur_steam_vol,
        steam_pressure_mpa=cur_steam_pres,
        soak_days=cur_soak_days,
        oil_price=oil_price,
        mechanical_risk_score=current_twin.rod_float_risk_score,
        custom_cutoff_days=cur_cutoff_days,
    )
    cur_coupled = simulate_coupled_response(
        cycle_number=current_twin.cycle_number,
        steam_volume_t=cur_steam_vol,
        steam_pressure_mpa=cur_steam_pres,
        soak_days=cur_soak_days,
        spm=cur_spm,
        stroke_length_in=cur_stroke,
        day_in_cycle=20,
    )

    # 6. Evaluate Proposed Scenario
    prop_css_eval = evaluate_scenario(
        cycle_number=current_twin.cycle_number,
        steam_volume_t=prop_steam_vol,
        steam_pressure_mpa=prop_steam_pres,
        soak_days=prop_soak_days,
        oil_price=oil_price,
        mechanical_risk_score=current_twin.rod_float_risk_score,
        custom_cutoff_days=prop_cutoff_days,
    )
    prop_coupled = simulate_coupled_response(
        cycle_number=current_twin.cycle_number,
        steam_volume_t=prop_steam_vol,
        steam_pressure_mpa=prop_steam_pres,
        soak_days=prop_soak_days,
        spm=prop_spm,
        stroke_length_in=prop_stroke,
        day_in_cycle=20,
    )

    # 7. Comparison calculations
    def make_metric(cur_val: float, prop_val: float) -> dict[str, float]:
        delta = round(prop_val - cur_val, 2)
        pct = round((delta / cur_val) * 100.0, 1) if abs(cur_val) > 1e-5 else 0.0
        return {
            "current": round(cur_val, 2),
            "proposed": round(prop_val, 2),
            "delta": delta,
            "delta_pct": pct,
        }

    comparison = {
        "production_oil_bbl": make_metric(
            cur_css_eval["predicted_oil_bbl"], prop_css_eval["predicted_oil_bbl"]
        ),
        "sor": make_metric(cur_css_eval["sor"], prop_css_eval["sor"]),
        "energy_cost_per_bbl": make_metric(
            cur_css_eval["energy_cost_per_bbl"], prop_css_eval["energy_cost_per_bbl"]
        ),
        "rod_float_risk_score": make_metric(
            cur_coupled["rod_mechanics"]["rod_float_risk_score"],
            prop_coupled["rod_mechanics"]["rod_float_risk_score"],
        ),
        "pump_volumetric_efficiency": make_metric(
            cur_coupled["pump"]["volumetric_efficiency"],
            prop_coupled["pump"]["volumetric_efficiency"],
        ),
        "economic_value_usd": make_metric(
            cur_css_eval["economic_value"], prop_css_eval["economic_value"]
        ),
    }

    return WhatIfResponse(
        well_id=well_id,
        scenario_inputs={
            "baseline": {
                "steam_volume_t": cur_steam_vol,
                "steam_pressure_mpa": cur_steam_pres,
                "soak_days": cur_soak_days,
                "cutoff_days": cur_cutoff_days,
                "spm": cur_spm,
                "stroke_length_in": cur_stroke,
            },
            "proposed": {
                "steam_volume_t": prop_steam_vol,
                "steam_pressure_mpa": prop_steam_pres,
                "soak_days": prop_soak_days,
                "cutoff_days": prop_cutoff_days,
                "spm": prop_spm,
                "stroke_length_in": prop_stroke,
            },
        },
        comparison=comparison,
        current_state_summary={
            "css": cur_css_eval,
            "srp": cur_coupled["rod_mechanics"],
        },
        proposed_state_summary={
            "css": prop_css_eval,
            "srp": prop_coupled["rod_mechanics"],
        },
        envelope_validation={
            "is_valid": True,
            "constraints_applied": SAFE_ENVELOPE,
        },
    )


@router.get(
    "/{well_id}/whatif/pareto",
    response_model=ParetoResponse,
    summary="Get 2-objective Pareto front trading off oil production vs Steam-Oil Ratio (SOR)",
)
async def get_whatif_pareto(
    well_id: str,
    session: AsyncSession = Depends(get_session),
) -> ParetoResponse:
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Well '{well_id}' was not found.",
        )

    twin_state = await get_well_twin_state(well_id=well_id, session=session)

    # Discrete safe grid
    steam_volumes = [1600.0, 2000.0, 2400.0, 2800.0, 3200.0, 3600.0]
    pressures = [10.0, 11.5, 12.5]
    soak_options = [3, 4, 5]

    candidates: list[dict[str, Any]] = []

    for v in steam_volumes:
        for p in pressures:
            for s in soak_options:
                scenario = evaluate_scenario(
                    cycle_number=twin_state.cycle_number,
                    steam_volume_t=v,
                    steam_pressure_mpa=p,
                    soak_days=s,
                    oil_price=DEFAULT_OIL_PRICE_PER_BBL,
                    mechanical_risk_score=twin_state.rod_float_risk_score,
                )
                candidates.append(scenario)

    # Sweep objective weight w for Oil Production vs (1 - w) for (1 / SOR)
    # Target: 10 to 20 Pareto optimal points
    weights = [
        0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40,
        0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80,
        0.85, 0.90, 0.95,
    ]

    max_oil = max(c["predicted_oil_bbl"] for c in candidates)
    min_oil = min(c["predicted_oil_bbl"] for c in candidates)
    max_sor = max(c["sor"] for c in candidates)
    min_sor = min(c["sor"] for c in candidates)

    selected_points: dict[tuple[float, float], tuple[dict[str, Any], float]] = {}

    for w in weights:
        best_cand = None
        best_score = -float("inf")
        for cand in candidates:
            # Normalize oil in [0, 1] (higher is better)
            norm_oil = (cand["predicted_oil_bbl"] - min_oil) / max(1.0, max_oil - min_oil)
            # Normalize SOR in [0, 1] (lower is better, so negate)
            norm_sor = (cand["sor"] - min_sor) / max(0.1, max_sor - min_sor)
            score = w * norm_oil - (1.0 - w) * norm_sor
            if score > best_score:
                best_score = score
                best_cand = cand

        if best_cand:
            key = (round(best_cand["predicted_oil_bbl"], 1), round(best_cand["sor"], 2))
            if key not in selected_points:
                selected_points[key] = (best_cand, w)

    # Filter strictly non-dominated points:
    # Point A dominates Point B if oil_A >= oil_B and sor_A <= sor_B with at least one strict inequality.
    raw_list = list(selected_points.values())
    non_dominated: list[tuple[dict[str, Any], float]] = []

    for cand_a, w_a in raw_list:
        oil_a = cand_a["predicted_oil_bbl"]
        sor_a = cand_a["sor"]
        is_dominated = False

        for cand_b, _ in raw_list:
            oil_b = cand_b["predicted_oil_bbl"]
            sor_b = cand_b["sor"]
            # B dominates A if oil_B >= oil_A and sor_B <= sor_A and not both equal
            if (oil_b >= oil_a and sor_b <= sor_a) and (oil_b > oil_a or sor_b < sor_a):
                is_dominated = True
                break

        if not is_dominated:
            non_dominated.append((cand_a, w_a))

    # Sort non-dominated points by ascending oil production (which will also have ascending SOR)
    non_dominated.sort(key=lambda item: item[0]["predicted_oil_bbl"])

    pareto_points: list[ParetoPoint] = []
    for idx, (cand, w) in enumerate(non_dominated, start=1):
        coupled = simulate_coupled_response(
            cycle_number=twin_state.cycle_number,
            steam_volume_t=cand["steam_volume_t"],
            steam_pressure_mpa=cand["steam_pressure_mpa"],
            soak_days=cand["soak_days"],
            spm=twin_state.current_spm,
            stroke_length_in=twin_state.stroke_length_in,
            day_in_cycle=20,
        )
        p_point = ParetoPoint(
            point_id=idx,
            steam_volume_t=cand["steam_volume_t"],
            steam_pressure_mpa=cand["steam_pressure_mpa"],
            soak_days=cand["soak_days"],
            production_cutoff_days=cand["production_cutoff_days"],
            cumulative_oil_bbl=cand["predicted_oil_bbl"],
            sor=cand["sor"],
            economic_value=cand["economic_value"],
            energy_cost_per_bbl=cand["energy_cost_per_bbl"],
            rod_float_risk_score=coupled["rod_mechanics"]["rod_float_risk_score"],
            objective_weight_oil=round(w, 2),
        )
        pareto_points.append(p_point)

    return ParetoResponse(
        well_id=well_id,
        points_count=len(pareto_points),
        pareto_front=pareto_points,
        optimization_axes={
            "x_axis": "cumulative_oil_bbl (maximize)",
            "y_axis": "sor (minimize)",
        },
    )

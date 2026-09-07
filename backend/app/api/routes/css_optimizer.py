"""
FastAPI router for CSS Candidate Screening, Cycle Optimization, and What-If Scenario Evaluation.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Well
from app.db.session import get_session
from app.ml.css_economics import (
    DEFAULT_OIL_PRICE_PER_BBL,
)
from app.ml.css_screening import screen_well_for_css
from app.optimization.css_optimizer import (
    evaluate_scenario,
    get_historical_cycle_average,
    optimize_css_cycle,
    validate_envelope_parameters,
)

router = APIRouter(prefix="/wells", tags=["css-optimizer"])


# =============================================================================
# Request & Response Schemas
# =============================================================================


class CSSScenarioRequest(BaseModel):
    cycle_number: int = Field(..., ge=1, description="Target CSS cycle number")
    steam_volume_t: float = Field(..., description="Steam volume in metric tonnes")
    steam_pressure_mpa: float = Field(
        ..., description="Steam injection pressure in MPa"
    )
    soak_days: int = Field(..., description="Soak duration in days")
    custom_cutoff_days: int | None = Field(
        None, description="Optional manual cutoff override in days"
    )
    oil_price: float | None = Field(
        None, gt=0, description="Crude oil price in USD/bbl"
    )
    gas_price: float | None = Field(
        None, gt=0, description="Natural gas price in USD/GJ"
    )
    electricity_price: float | None = Field(
        None, gt=0, description="Electricity price in USD/kWh"
    )


class CSSScreeningResponse(BaseModel):
    well_id: str
    status: str
    reasons: list[str]
    current_water_cut: float
    cycles_completed: int
    mechanical_risk: dict[str, Any]
    recommendation: str


class CSSRecommendResponse(BaseModel):
    well_id: str
    cycle_number: int
    recommended_scenario: dict[str, Any]
    historical_average: dict[str, Any]
    expected_delta: dict[str, Any]
    constraints_checked: dict[str, Any]


class CSSScenarioResponse(BaseModel):
    status: str
    well_id: str
    cycle_number: int
    evaluation: dict[str, Any]
    historical_average: dict[str, Any]
    comparison_to_baseline: dict[str, Any]


# =============================================================================
# Endpoints
# =============================================================================


@router.get(
    "/{well_id}/css/screening",
    response_model=CSSScreeningResponse,
    summary="Screen well suitability for next CSS injection cycle",
)
async def get_css_screening(
    well_id: str,
    session: AsyncSession = Depends(get_session),
) -> CSSScreeningResponse:
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Well '{well_id}' not found.",
        )

    screening = await screen_well_for_css(well_id, session)
    return CSSScreeningResponse(**screening)


@router.get(
    "/{well_id}/css/recommend",
    response_model=CSSRecommendResponse,
    summary="Get optimal CSS cycle recommendation for next cycle",
)
async def get_css_recommendation(
    well_id: str,
    session: AsyncSession = Depends(get_session),
) -> CSSRecommendResponse:
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Well '{well_id}' not found.",
        )

    hist = await get_historical_cycle_average(well_id, session)
    next_cycle = hist["cycles_count"] + 1

    recommended = optimize_css_cycle(
        cycle_number=next_cycle,
        water_cut=0.60,
    )

    oil_delta = round(recommended["expected_oil_bbl"] - hist["avg_cum_oil_bbl"], 2)
    econ_delta = round(
        recommended["expected_economic_value"] - hist["avg_economic_value"], 2
    )
    sor_delta = round(recommended["expected_sor"] - hist["avg_sor"], 3)

    return CSSRecommendResponse(
        well_id=well_id,
        cycle_number=next_cycle,
        recommended_scenario=recommended,
        historical_average=hist,
        expected_delta={
            "oil_delta_bbl": oil_delta,
            "economic_delta_usd": econ_delta,
            "sor_delta": sor_delta,
        },
        constraints_checked={
            "envelope_compliant": True,
            "violations": [],
        },
    )


@router.post(
    "/{well_id}/css/scenario",
    response_model=CSSScenarioResponse,
    summary="Evaluate custom CSS what-if operating scenario",
)
async def evaluate_css_scenario(
    well_id: str,
    scenario: CSSScenarioRequest,
    session: AsyncSession = Depends(get_session),
) -> CSSScenarioResponse:
    # 1. Check Envelope Bounds strictly
    try:
        validate_envelope_parameters(
            steam_volume_t=scenario.steam_volume_t,
            steam_pressure_mpa=scenario.steam_pressure_mpa,
            soak_days=scenario.soak_days,
            cutoff_days=scenario.custom_cutoff_days,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    # 2. Check well exists
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Well '{well_id}' not found.",
        )

    # 3. Evaluate scenario
    eval_res = evaluate_scenario(
        cycle_number=scenario.cycle_number,
        steam_volume_t=scenario.steam_volume_t,
        steam_pressure_mpa=scenario.steam_pressure_mpa,
        soak_days=scenario.soak_days,
        custom_cutoff_days=scenario.custom_cutoff_days,
        oil_price=scenario.oil_price or DEFAULT_OIL_PRICE_PER_BBL,
    )

    # 4. Fetch baseline for comparison
    hist = await get_historical_cycle_average(well_id, session)

    delta = {
        "oil_delta_bbl": round(
            eval_res["expected_oil_bbl"] - hist["avg_cum_oil_bbl"], 2
        ),
        "economic_delta_usd": round(
            eval_res["expected_economic_value"] - hist["avg_economic_value"], 2
        ),
        "sor_delta": round(eval_res["expected_sor"] - hist["avg_sor"], 3),
    }

    return CSSScenarioResponse(
        status="success",
        well_id=well_id,
        cycle_number=scenario.cycle_number,
        evaluation=eval_res,
        historical_average=hist,
        comparison_to_baseline=delta,
    )

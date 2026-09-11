"""
FastAPI router for SRP dynamometer card diagnostics and rod-float risk evaluation.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import DynamometerCard, Production, SRPTelemetry, Well
from app.db.session import get_session
from app.ml.dyna_classifier import predict_card
from app.ml.rod_float_risk import calculate_rod_float_risk

router = APIRouter(prefix="/wells", tags=["diagnostics"])


# =============================================================================
# Request & Response Schemas
# =============================================================================


class CardPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    position: float
    load: float


class FactorDetail(BaseModel):
    raw_value: float
    normalized_factor: float
    weight: float
    weighted_contribution: float


class AdjustmentRecommendation(BaseModel):
    action: str
    rule: str
    current_spm: float
    target_spm: float
    spm_reduction_pct: float
    warning: str | None = None


class RodFloatRiskResponse(BaseModel):
    risk_score: float
    risk_level: str
    factor_breakdown: dict[str, FactorDetail]
    recommendation: AdjustmentRecommendation


class DiagnosticReport(BaseModel):
    well_id: str
    card_id: int | None = None
    timestamp: datetime | None = None
    ground_truth_label: str | None = None
    ml_prediction: str
    baseline_prediction: str
    confidence: float
    probabilities: dict[str, float]
    rod_float_risk: RodFloatRiskResponse
    features: dict[str, float]
    card_points: list[CardPoint]


class ClassifyRequest(BaseModel):
    card_points: list[CardPoint] = Field(..., min_length=4)
    spm: float | None = None
    temperature_c: float | None = None
    viscosity_cp: float | None = None
    pump_fillage: float | None = None


# =============================================================================
# Helper Utilities
# =============================================================================


async def _verify_well_exists(well_id: str, session: AsyncSession) -> None:
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' was not found")


# =============================================================================
# Diagnostic Endpoints
# =============================================================================


@router.get(
    "/{well_id}/diagnostics/latest",
    response_model=DiagnosticReport,
    summary="Get latest dynamometer classification and rod-float risk assessment",
)
async def get_latest_diagnostics(
    well_id: str,
    session: AsyncSession = Depends(get_session),
) -> DiagnosticReport:
    """
    Retrieve the most recent dynamometer card for a well, extract features,
    run ML and baseline classification, and compute explainable rod-float risk.
    """
    await _verify_well_exists(well_id, session)

    # 1. Fetch latest card
    q_card = (
        select(DynamometerCard)
        .where(DynamometerCard.well_id == well_id)
        .order_by(desc(DynamometerCard.timestamp))
        .limit(1)
    )
    latest_card = (await session.execute(q_card)).scalar_one_or_none()
    if not latest_card:
        raise HTTPException(
            status_code=404,
            detail=f"No dynamometer cards found for well '{well_id}'",
        )

    # 2. Fetch recent historical cards for cycle-to-cycle variance
    q_hist = (
        select(DynamometerCard.card_points_json)
        .where(
            DynamometerCard.well_id == well_id,
            DynamometerCard.id != latest_card.id,
        )
        .order_by(desc(DynamometerCard.timestamp))
        .limit(3)
    )
    hist_cards = (await session.execute(q_hist)).scalars().all()

    # 3. Fetch latest telemetry and production for operating parameters
    q_telem = (
        select(SRPTelemetry).where(SRPTelemetry.well_id == well_id).order_by(desc(SRPTelemetry.timestamp)).limit(1)
    )
    latest_telem = (await session.execute(q_telem)).scalar_one_or_none()
    spm = latest_telem.spm if latest_telem else 8.0

    q_prod = select(Production).where(Production.well_id == well_id).order_by(desc(Production.timestamp)).limit(1)
    latest_prod = (await session.execute(q_prod)).scalar_one_or_none()
    temp_c = latest_prod.temperature_c if latest_prod else 55.0

    # 4. Run classification
    card_pts = latest_card.card_points_json
    cls_result = predict_card(card_pts, history_cards=hist_cards)

    # 5. Run rod-float risk evaluation
    feats = cls_result["features"]
    risk_result = calculate_rod_float_risk(
        min_load=feats["min_load"],
        downstroke_load_variance=feats["downstroke_load_variance"],
        load_derivative_max=feats["load_derivative_max"],
        spm=spm,
        temperature_c=temp_c,
    )

    return DiagnosticReport(
        well_id=well_id,
        card_id=latest_card.id,
        timestamp=latest_card.timestamp,
        ground_truth_label=latest_card.label,
        ml_prediction=cls_result["ml_prediction"],
        baseline_prediction=cls_result["baseline_prediction"],
        confidence=cls_result["confidence"],
        probabilities=cls_result["probabilities"],
        rod_float_risk=RodFloatRiskResponse(**risk_result),
        features=feats,
        card_points=[CardPoint(**p) for p in card_pts],
    )


@router.post(
    "/{well_id}/diagnostics/classify",
    response_model=DiagnosticReport,
    summary="Classify a raw dynamometer card in real time",
)
async def classify_raw_card(
    well_id: str,
    payload: ClassifyRequest,
    session: AsyncSession = Depends(get_session),
) -> DiagnosticReport:
    """
    Accept raw dynamometer card points (e.g., from an edge sensor or ESP32)
    and optional real-time operating metrics, run classification and return report.
    """
    await _verify_well_exists(well_id, session)

    # 1. Fetch recent cards for cycle-to-cycle variance context
    q_hist = (
        select(DynamometerCard.card_points_json)
        .where(DynamometerCard.well_id == well_id)
        .order_by(desc(DynamometerCard.timestamp))
        .limit(3)
    )
    hist_cards = (await session.execute(q_hist)).scalars().all()

    # Convert Pydantic points to dicts
    card_pts = [{"position": p.position, "load": p.load} for p in payload.card_points]

    # 2. Run classification
    cls_result = predict_card(card_pts, history_cards=hist_cards)

    # 3. Resolve operating parameters
    spm = payload.spm or 8.0
    temp_c = payload.temperature_c
    visc = payload.viscosity_cp
    fill = payload.pump_fillage or 0.85

    feats = cls_result["features"]
    risk_result = calculate_rod_float_risk(
        min_load=feats["min_load"],
        downstroke_load_variance=feats["downstroke_load_variance"],
        load_derivative_max=feats["load_derivative_max"],
        spm=spm,
        temperature_c=temp_c,
        viscosity_cp=visc,
        pump_fillage=fill,
    )

    return DiagnosticReport(
        well_id=well_id,
        card_id=None,
        timestamp=datetime.now(UTC),
        ground_truth_label=None,
        ml_prediction=cls_result["ml_prediction"],
        baseline_prediction=cls_result["baseline_prediction"],
        confidence=cls_result["confidence"],
        probabilities=cls_result["probabilities"],
        rod_float_risk=RodFloatRiskResponse(**risk_result),
        features=feats,
        card_points=[CardPoint(**p) for p in card_pts],
    )

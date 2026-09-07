"""FastAPI router for Twin Joint State and Combined Recommendation.

Exposes digital twin joint state and the combined CSS + SRP recommendation engine.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Well
from app.db.session import get_session
from app.twin.joint_state import WellTwinState, get_well_twin_state
from app.twin.recommendation_engine import generate_joint_recommendation

router = APIRouter(prefix="/wells", tags=["twin"])


class JointRecommendationResponse(BaseModel):
    well_id: str
    current_state: dict[str, Any]
    predicted_trajectory: dict[str, Any]
    recommendation: dict[str, Any]
    reasons: list[str]
    expected_effect: dict[str, Any]
    requires_operator_approval: bool


@router.get(
    "/{well_id}/twin/state",
    response_model=WellTwinState,
    summary="Get unified reservoir and mechanical digital twin state",
)
async def get_twin_state(
    well_id: str,
    session: AsyncSession = Depends(get_session),
) -> WellTwinState:
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Well '{well_id}' was not found.",
        )
    return await get_well_twin_state(well_id=well_id, session=session)


@router.get(
    "/{well_id}/twin/recommendation",
    response_model=JointRecommendationResponse,
    summary="Generate combined CSS + SRP recommendation with full physical explainability",
)
async def get_joint_recommendation_endpoint(
    well_id: str,
    session: AsyncSession = Depends(get_session),
) -> JointRecommendationResponse:
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Well '{well_id}' was not found.",
        )
    result = await generate_joint_recommendation(well_id=well_id, session=session)
    return JointRecommendationResponse(**result)

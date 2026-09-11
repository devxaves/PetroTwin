"""FastAPI router for Operator Approval Audit Logging.

Provides strictly non-actuating audit trail logging for operator sign-offs,
modifications, or rejections of twin recommendations.
Under no circumstances does any endpoint here dispatch external control signals.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.metrics import APPROVALS_RECORDED
from app.core.auth import User, require_role
from app.db.models import OperatorApproval, Well
from app.db.session import get_session

router = APIRouter(prefix="/wells", tags=["approvals"])

VALID_DECISIONS = {"approved", "rejected", "modified"}


# =============================================================================
# Request & Response Schemas
# =============================================================================


class ApprovalCreateRequest(BaseModel):
    recommendation_snapshot: dict[str, Any] = Field(
        ..., description="Snapshot of the joint recommendation payload at review time"
    )
    operator_decision: str = Field(
        ..., description="Decision choice: 'approved', 'rejected', or 'modified'"
    )
    operator_notes: str | None = Field(
        None, max_length=512, description="Optional engineering remarks or reasoning"
    )


class ApprovalResponse(BaseModel):
    id: int
    well_id: str
    recommendation_snapshot: dict[str, Any]
    operator_decision: str
    operator_notes: str | None
    decided_at: datetime
    outcome_recorded_at: datetime | None = None


# =============================================================================
# Endpoints
# =============================================================================


@router.post(
    "/{well_id}/approvals",
    response_model=ApprovalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record operator sign-off, modification, or rejection for audit trail",
)
async def record_operator_approval(
    well_id: str,
    payload: ApprovalCreateRequest,
    current_user: User = Depends(require_role(["approver"])),
    session: AsyncSession = Depends(get_session),
) -> ApprovalResponse:
    """
    Log an operator decision against a digital twin recommendation.

    NOTE: This endpoint strictly appends an audit record to the database.
    It does NOT connect to SCADA/RTU, send telemetry commands, or execute
    physical hardware actuators. Operator approval is strictly recorded for
    compliance and future closed-loop model evaluation.
    Protected by role-based access control: requires 'approver' role.
    """
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Well '{well_id}' was not found.",
        )

    decision_clean = payload.operator_decision.strip().lower()
    if decision_clean not in VALID_DECISIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid operator decision '{payload.operator_decision}'. "
            f"Allowed decisions: {sorted(VALID_DECISIONS)}",
        )

    record = OperatorApproval(
        well_id=well_id,
        recommendation_snapshot_json=payload.recommendation_snapshot,
        operator_decision=decision_clean,
        operator_notes=payload.operator_notes,
        decided_at=datetime.now(UTC),
        outcome_recorded_at=None,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)

    # Track Prometheus metric
    APPROVALS_RECORDED.labels(decision=decision_clean).inc()

    return ApprovalResponse(
        id=record.id,
        well_id=record.well_id,
        recommendation_snapshot=record.recommendation_snapshot_json,
        operator_decision=record.operator_decision,
        operator_notes=record.operator_notes,
        decided_at=record.decided_at,
        outcome_recorded_at=record.outcome_recorded_at,
    )


@router.get(
    "/{well_id}/approvals",
    response_model=list[ApprovalResponse],
    summary="Retrieve operator approval history and audit trail for a well",
)
async def get_operator_approvals(
    well_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[ApprovalResponse]:
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Well '{well_id}' was not found.",
        )

    stmt = (
        select(OperatorApproval)
        .where(OperatorApproval.well_id == well_id)
        .order_by(OperatorApproval.decided_at.desc())
    )
    records = (await session.execute(stmt)).scalars().all()

    return [
        ApprovalResponse(
            id=rec.id,
            well_id=rec.well_id,
            recommendation_snapshot=rec.recommendation_snapshot_json,
            operator_decision=rec.operator_decision,
            operator_notes=rec.operator_notes,
            decided_at=rec.decided_at,
            outcome_recorded_at=rec.outcome_recorded_at,
        )
        for rec in records
    ]

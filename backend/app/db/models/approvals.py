from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.db.models import Well

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base

JSONType = JSON().with_variant(JSONB, "postgresql")


class OperatorApproval(Base):
    """Operator approval/rejection/modification audit log for twin recommendations."""

    __tablename__ = "operator_approvals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    well_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("wells.well_id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    recommendation_snapshot_json: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False
    )
    operator_decision: Mapped[str] = mapped_column(String(32), nullable=False)
    operator_notes: Mapped[str | None] = mapped_column(String(512), nullable=True)
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    outcome_recorded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    well: Mapped[Well] = relationship("Well", back_populates="operator_approvals")

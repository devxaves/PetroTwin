"""Create operator approvals audit log table

Revision ID: 002_operator_approvals
Revises: 001_initial_schema
Create Date: 2026-09-07 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "002_operator_approvals"
down_revision: str | None = "001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    json_type = sa.JSON().with_variant(postgresql.JSONB, "postgresql")
    op.create_table(
        "operator_approvals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("well_id", sa.String(length=64), nullable=False),
        sa.Column("recommendation_snapshot_json", json_type, nullable=False),
        sa.Column("operator_decision", sa.String(length=32), nullable=False),
        sa.Column("operator_notes", sa.String(length=512), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("outcome_recorded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["well_id"], ["wells.well_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_operator_approvals_well_id"),
        "operator_approvals",
        ["well_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_operator_approvals_well_id"), table_name="operator_approvals"
    )
    op.drop_table("operator_approvals")

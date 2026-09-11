"""Initial database schema with TimescaleDB hypertables

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-09-07 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 0. Enable TimescaleDB extension if in PostgreSQL
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")

    # 1. Create 'wells' table
    op.create_table(
        "wells",
        sa.Column("well_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("depth_m", sa.Float(), nullable=False),
        sa.Column("reservoir_name", sa.String(length=128), nullable=False),
        sa.Column("completion_type", sa.String(length=64), nullable=False),
        sa.Column("pump_type", sa.String(length=64), nullable=False),
        sa.Column("commission_date", sa.Date(), nullable=False),
        sa.PrimaryKeyConstraint("well_id"),
    )
    op.create_index(op.f("ix_wells_well_id"), "wells", ["well_id"], unique=False)

    # 2. Create 'production' table (hypertable)
    op.create_table(
        "production",
        sa.Column("well_id", sa.String(length=64), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("oil_rate_bopd", sa.Float(), nullable=False),
        sa.Column("water_rate_bwpd", sa.Float(), nullable=False),
        sa.Column("gas_rate", sa.Float(), nullable=False),
        sa.Column("water_cut", sa.Float(), nullable=False),
        sa.Column("tubing_pressure", sa.Float(), nullable=False),
        sa.Column("casing_pressure", sa.Float(), nullable=False),
        sa.Column("fluid_level_m", sa.Float(), nullable=False),
        sa.Column("temperature_c", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["well_id"], ["wells.well_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("well_id", "timestamp"),
    )
    op.create_index(op.f("ix_production_timestamp"), "production", ["timestamp"], unique=False)

    # 3. Create 'css_cycles' table
    op.create_table(
        "css_cycles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("well_id", sa.String(length=64), nullable=False),
        sa.Column("cycle_id", sa.Integer(), nullable=False),
        sa.Column("injection_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("injection_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("steam_volume_t", sa.Float(), nullable=False),
        sa.Column("steam_rate", sa.Float(), nullable=False),
        sa.Column("steam_pressure", sa.Float(), nullable=False),
        sa.Column("steam_temperature_c", sa.Float(), nullable=False),
        sa.Column("steam_quality", sa.Float(), nullable=False),
        sa.Column("soak_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("soak_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("production_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("production_end", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["well_id"], ["wells.well_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_css_cycles_well_id"), "css_cycles", ["well_id"], unique=False)

    # 4. Create 'srp_telemetry' table (hypertable)
    op.create_table(
        "srp_telemetry",
        sa.Column("well_id", sa.String(length=64), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("stroke_length_in", sa.Float(), nullable=False),
        sa.Column("spm", sa.Float(), nullable=False),
        sa.Column("vfd_frequency", sa.Float(), nullable=False),
        sa.Column("motor_current", sa.Float(), nullable=False),
        sa.Column("motor_power", sa.Float(), nullable=False),
        sa.Column("polished_rod_load", sa.Float(), nullable=False),
        sa.Column("polished_rod_position", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["well_id"], ["wells.well_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("well_id", "timestamp"),
    )
    op.create_index(op.f("ix_srp_telemetry_timestamp"), "srp_telemetry", ["timestamp"], unique=False)

    # 5. Create 'dynamometer_cards' table
    json_col = postgresql.JSONB(astext_type=sa.Text()) if bind.dialect.name == "postgresql" else sa.JSON()
    op.create_table(
        "dynamometer_cards",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("well_id", sa.String(length=64), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("card_points_json", json_col, nullable=False),
        sa.Column("label", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["well_id"], ["wells.well_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_dynamometer_cards_well_id"),
        "dynamometer_cards",
        ["well_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_dynamometer_cards_timestamp"),
        "dynamometer_cards",
        ["timestamp"],
        unique=False,
    )
    op.create_index(op.f("ix_dynamometer_cards_label"), "dynamometer_cards", ["label"], unique=False)

    # 6. Create 'failures' table
    op.create_table(
        "failures",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("well_id", sa.String(length=64), nullable=False),
        sa.Column("event_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("failure_type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("downtime_hours", sa.Float(), nullable=False),
        sa.Column("root_cause", sa.String(length=256), nullable=False),
        sa.ForeignKeyConstraint(["well_id"], ["wells.well_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_failures_well_id"), "failures", ["well_id"], unique=False)
    op.create_index(op.f("ix_failures_event_time"), "failures", ["event_time"], unique=False)

    # 7. Convert tables to TimescaleDB hypertables if on PostgreSQL
    if bind.dialect.name == "postgresql":
        op.execute("SELECT create_hypertable('production', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);")
        op.execute(
            "SELECT create_hypertable('srp_telemetry', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);"
        )


def downgrade() -> None:
    op.drop_table("failures")
    op.drop_table("dynamometer_cards")
    op.drop_table("srp_telemetry")
    op.drop_table("css_cycles")
    op.drop_table("production")
    op.drop_table("wells")

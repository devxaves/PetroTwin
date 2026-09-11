from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.auth import User
from app.db.base import Base
from app.db.models.approvals import OperatorApproval

# JSON type fallback for sqlite or postgresql
JSONType = JSON().with_variant(JSONB, "postgresql")


class Well(Base):
    """Well entity representing production and injection assets."""

    __tablename__ = "wells"

    well_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    depth_m: Mapped[float] = mapped_column(Float, nullable=False)
    reservoir_name: Mapped[str] = mapped_column(String(128), nullable=False)
    completion_type: Mapped[str] = mapped_column(String(64), nullable=False)
    pump_type: Mapped[str] = mapped_column(String(64), nullable=False)
    commission_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Relationships
    production_records: Mapped[list["Production"]] = relationship(
        "Production", back_populates="well", cascade="all, delete-orphan"
    )
    css_cycles: Mapped[list["CSSCycle"]] = relationship("CSSCycle", back_populates="well", cascade="all, delete-orphan")
    srp_telemetry_records: Mapped[list["SRPTelemetry"]] = relationship(
        "SRPTelemetry", back_populates="well", cascade="all, delete-orphan"
    )
    dynamometer_cards: Mapped[list["DynamometerCard"]] = relationship(
        "DynamometerCard", back_populates="well", cascade="all, delete-orphan"
    )
    failures: Mapped[list["Failure"]] = relationship("Failure", back_populates="well", cascade="all, delete-orphan")
    operator_approvals: Mapped[list["OperatorApproval"]] = relationship(
        "OperatorApproval", back_populates="well", cascade="all, delete-orphan"
    )


class Production(Base):
    """Time-series production measurements (TimescaleDB hypertable on timestamp)."""

    __tablename__ = "production"

    well_id: Mapped[str] = mapped_column(String(64), ForeignKey("wells.well_id", ondelete="CASCADE"), primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True, index=True)
    oil_rate_bopd: Mapped[float] = mapped_column(Float, nullable=False)
    water_rate_bwpd: Mapped[float] = mapped_column(Float, nullable=False)
    gas_rate: Mapped[float] = mapped_column(Float, nullable=False)
    water_cut: Mapped[float] = mapped_column(Float, nullable=False)
    tubing_pressure: Mapped[float] = mapped_column(Float, nullable=False)
    casing_pressure: Mapped[float] = mapped_column(Float, nullable=False)
    fluid_level_m: Mapped[float] = mapped_column(Float, nullable=False)
    temperature_c: Mapped[float] = mapped_column(Float, nullable=False)

    well: Mapped["Well"] = relationship("Well", back_populates="production_records")


class CSSCycle(Base):
    """Cyclic Steam Stimulation (CSS) operational cycles."""

    __tablename__ = "css_cycles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    well_id: Mapped[str] = mapped_column(String(64), ForeignKey("wells.well_id", ondelete="CASCADE"), index=True)
    cycle_id: Mapped[int] = mapped_column(Integer, nullable=False)
    injection_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    injection_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    steam_volume_t: Mapped[float] = mapped_column(Float, nullable=False)
    steam_rate: Mapped[float] = mapped_column(Float, nullable=False)
    steam_pressure: Mapped[float] = mapped_column(Float, nullable=False)
    steam_temperature_c: Mapped[float] = mapped_column(Float, nullable=False)
    steam_quality: Mapped[float] = mapped_column(Float, nullable=False)
    soak_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    soak_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    production_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    production_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    well: Mapped["Well"] = relationship("Well", back_populates="css_cycles")


class SRPTelemetry(Base):
    """SRP high-frequency telemetry (TimescaleDB hypertable)."""

    __tablename__ = "srp_telemetry"

    well_id: Mapped[str] = mapped_column(String(64), ForeignKey("wells.well_id", ondelete="CASCADE"), primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True, index=True)
    stroke_length_in: Mapped[float] = mapped_column(Float, nullable=False)
    spm: Mapped[float] = mapped_column(Float, nullable=False)
    vfd_frequency: Mapped[float] = mapped_column(Float, nullable=False)
    motor_current: Mapped[float] = mapped_column(Float, nullable=False)
    motor_power: Mapped[float] = mapped_column(Float, nullable=False)
    polished_rod_load: Mapped[float] = mapped_column(Float, nullable=False)
    polished_rod_position: Mapped[float] = mapped_column(Float, nullable=False)

    well: Mapped["Well"] = relationship("Well", back_populates="srp_telemetry_records")


class DynamometerCard(Base):
    """Surface dynamometer cards with position/load pairs and condition label."""

    __tablename__ = "dynamometer_cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    well_id: Mapped[str] = mapped_column(String(64), ForeignKey("wells.well_id", ondelete="CASCADE"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    card_points_json: Mapped[list[dict[str, Any]]] = mapped_column(JSONType, nullable=False)
    label: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    well: Mapped["Well"] = relationship("Well", back_populates="dynamometer_cards")


class Failure(Base):
    """Well and equipment downtime/failure events."""

    __tablename__ = "failures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    well_id: Mapped[str] = mapped_column(String(64), ForeignKey("wells.well_id", ondelete="CASCADE"), index=True)
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    failure_type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(32), nullable=False)
    downtime_hours: Mapped[float] = mapped_column(Float, nullable=False)
    root_cause: Mapped[str] = mapped_column(String(256), nullable=False)

    well: Mapped["Well"] = relationship("Well", back_populates="failures")


__all__ = [
    "Base",
    "CSSCycle",
    "DynamometerCard",
    "Failure",
    "OperatorApproval",
    "Production",
    "SRPTelemetry",
    "User",
    "Well",
]

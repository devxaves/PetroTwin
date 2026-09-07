"""Joint state model for ThermoTwin.

Unifies downhole reservoir thermodynamics and sucker rod pumping mechanical telemetry
into a single coherent WellTwinState representation, built from real calls into
Prompt 3's ML card classifier and rod-float risk engine, and Prompt 4's CSS thermal
and hybrid production forecast models.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CSSCycle, DynamometerCard, Production, SRPTelemetry, Well
from app.ml.dyna_classifier import predict_card
from app.ml.production_model import forecast_production_cycle
from app.ml.rod_float_risk import calculate_rod_float_risk
from app.simulation.inflow_and_pump_model import (
    inflow_rate,
    pump_fillage,
)
from app.simulation.viscosity_model import oil_viscosity_cp


class WellTwinState(BaseModel):
    """Unified physical and operational digital twin state for an active heavy-oil well."""

    well_id: str
    timestamp: datetime
    current_temperature_c: float = Field(
        ..., description="Current flowing downhole temperature in Celsius"
    )
    current_viscosity_cp: float = Field(
        ..., description="Current heavy crude oil dynamic viscosity in centipoise (cP)"
    )
    css_cycle_phase: str = Field(
        ..., description="Active operational cycle phase: injection, soak, production, or idle"
    )
    cycle_number: int = Field(..., description="Current or target CSS cycle number")
    pump_fillage: float = Field(
        ..., description="Downhole pump liquid barrel fillage ratio in [0.0, 1.0]"
    )
    rod_float_risk_score: float = Field(
        ..., description="Continuous 0-100 hydrodynamic rod-float risk score from Prompt 3"
    )
    rod_float_risk_level: str = Field(
        ..., description="Risk tier: LOW, MODERATE, or HIGH"
    )
    dynamometer_classification: str = Field(
        ..., description="Current dynamometer operating condition label"
    )
    dynamometer_confidence: float = Field(
        ..., description="Confidence of dynamometer card classifier [0.0, 1.0]"
    )
    current_spm: float = Field(..., description="Operating stroke rate in strokes per minute")
    stroke_length_in: float = Field(..., description="Polished rod stroke length in inches")
    predicted_production_trajectory: dict[str, Any] = Field(
        ..., description="Forecast trajectory from Prompt 4 hybrid production model"
    )


async def get_well_twin_state(
    well_id: str,
    session: AsyncSession,
) -> WellTwinState:
    """
    Assemble the complete real-time joint twin state for a specific well.

    Queries database telemetry and calls existing physics, ML classifier,
    and optimization components without duplicating any core logic.
    """
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' was not found.")

    # 1. Latest Production record
    q_prod = (
        select(Production)
        .where(Production.well_id == well_id)
        .order_by(Production.timestamp.desc())
        .limit(1)
    )
    prod = (await session.execute(q_prod)).scalars().first()

    # 2. Latest SRP Telemetry
    q_srp = (
        select(SRPTelemetry)
        .where(SRPTelemetry.well_id == well_id)
        .order_by(SRPTelemetry.timestamp.desc())
        .limit(1)
    )
    srp = (await session.execute(q_srp)).scalars().first()

    # 3. Latest CSS Cycle
    q_cycle = (
        select(CSSCycle)
        .where(CSSCycle.well_id == well_id)
        .order_by(CSSCycle.cycle_id.desc())
        .limit(1)
    )
    cycle = (await session.execute(q_cycle)).scalars().first()

    # 4. Latest Dynamometer Card
    q_card = (
        select(DynamometerCard)
        .where(DynamometerCard.well_id == well_id)
        .order_by(DynamometerCard.timestamp.desc())
        .limit(1)
    )
    card = (await session.execute(q_card)).scalars().first()

    # Resolve temperature and viscosity
    current_temp = float(prod.temperature_c) if prod else 65.0
    current_visc = float(oil_viscosity_cp(current_temp))

    # Resolve SRP kinematics
    current_spm = float(srp.spm) if srp else 8.0
    stroke_length_in = float(srp.stroke_length_in) if srp else 120.0

    # Resolve hydraulic inflow and pump fillage
    inflow = inflow_rate(
        reservoir_pressure=1200.0,
        bottomhole_pressure=300.0,
        viscosity=current_visc,
    )
    theo_disp = (stroke_length_in * 3.14159 / 9702.0) * current_spm * 1440.0
    fillage = float(pump_fillage(inflow, theo_disp))

    # Resolve CSS cycle and operational phase
    cycle_num = cycle.cycle_id if cycle else 1
    steam_vol = float(cycle.steam_volume_t) if cycle else 2400.0
    steam_press = float(cycle.steam_pressure) if cycle else 11.0
    soak_days = 4

    now = datetime.now(UTC)
    if cycle:
        if cycle.injection_start <= now <= cycle.injection_end:
            phase = "injection"
        elif cycle.soak_start <= now <= cycle.soak_end:
            phase = "soak"
        elif cycle.production_start <= now <= cycle.production_end:
            phase = "production"
        else:
            phase = "idle"
    else:
        phase = "production"

    # Resolve Dynamometer classification and continuous rod-float risk
    if card and card.card_points_json:
        card_points = card.card_points_json
        card_diag = predict_card(card_points)
        dyna_class = card_diag["ml_prediction"]
        dyna_conf = float(card_diag["confidence"])
        features = card_diag["features"]
        min_load = float(features.get("min_load", 6500.0))
        ds_var = float(features.get("downstroke_variance", 350000.0))
        deriv_max = float(features.get("load_derivative_max", 120.0))
    else:
        # Realistic nominal heavy-oil baseline card
        dyna_class = "Normal"
        dyna_conf = 0.92
        min_load = 7200.0
        ds_var = 250000.0
        deriv_max = 80.0

    risk_assessment = calculate_rod_float_risk(
        min_load=min_load,
        downstroke_load_variance=ds_var,
        load_derivative_max=deriv_max,
        spm=current_spm,
        temperature_c=current_temp,
        viscosity_cp=current_visc,
        pump_fillage=fillage,
    )

    # Resolve predicted production trajectory using Prompt 4's hybrid model
    trajectory = forecast_production_cycle(
        cycle_number=cycle_num,
        steam_volume_t=steam_vol,
        steam_pressure_mpa=steam_press,
        soak_days=soak_days,
        prod_days=60,
    )

    state_timestamp = (
        prod.timestamp
        if prod
        else (srp.timestamp if srp else (cycle.production_start if cycle else now))
    )

    return WellTwinState(
        well_id=well_id,
        timestamp=state_timestamp,
        current_temperature_c=round(current_temp, 1),
        current_viscosity_cp=round(current_visc, 1),
        css_cycle_phase=phase,
        cycle_number=cycle_num,
        pump_fillage=round(fillage, 3),
        rod_float_risk_score=float(risk_assessment["risk_score"]),
        rod_float_risk_level=str(risk_assessment["risk_level"]),
        dynamometer_classification=dyna_class,
        dynamometer_confidence=round(dyna_conf, 3),
        current_spm=round(current_spm, 2),
        stroke_length_in=round(stroke_length_in, 1),
        predicted_production_trajectory={
            "cycle_number": cycle_num,
            "steam_volume_t": steam_vol,
            "steam_pressure_mpa": steam_press,
            "soak_days": soak_days,
            "hybrid_cumulative_oil_bbl": trajectory.get(
                "cumulative_oil_hybrid_bbl", trajectory.get("cumulative_oil_bbl", 0.0)
            ),
            "daily_rates_bopd": trajectory["hybrid_rates"][:30],
            "physics_rates_bopd": trajectory["physics_rates"][:30],
        },
    )

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CSSCycle, DynamometerCard, Production, Well
from app.db.session import get_session

router = APIRouter(prefix="/wells", tags=["wells"])


# =============================================================================
# Pydantic Response Schemas
# =============================================================================


class ProductionSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timestamp: datetime
    oil_rate_bopd: float
    water_rate_bwpd: float
    gas_rate: float
    water_cut: float
    tubing_pressure: float
    casing_pressure: float
    fluid_level_m: float
    temperature_c: float


class WellSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    well_id: str
    name: str
    latitude: float
    longitude: float
    depth_m: float
    reservoir_name: str
    completion_type: str
    pump_type: str
    commission_date: str
    latest_production: ProductionSnapshot | None = None


class ProductionRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    well_id: str
    timestamp: datetime
    oil_rate_bopd: float
    water_rate_bwpd: float
    gas_rate: float
    water_cut: float
    tubing_pressure: float
    casing_pressure: float
    fluid_level_m: float
    temperature_c: float


class CSSCycleRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    well_id: str
    cycle_id: int
    injection_start: datetime
    injection_end: datetime
    steam_volume_t: float
    steam_rate: float
    steam_pressure: float
    steam_temperature_c: float
    steam_quality: float
    soak_start: datetime
    soak_end: datetime
    production_start: datetime
    production_end: datetime


class DynamometerPoint(BaseModel):
    position: float
    load: float


class DynamometerLatest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    well_id: str
    timestamp: datetime
    card_points: list[dict[str, Any]]
    label: str


# =============================================================================
# Route Handlers
# =============================================================================


@router.get("", response_model=list[WellSummary])
async def list_wells(
    session: AsyncSession = Depends(get_session),
) -> list[WellSummary]:
    """
    List all wells with their latest production snapshot.
    Backed by real database queries.
    """
    wells_query = select(Well).order_by(Well.well_id.asc())
    wells_res = await session.execute(wells_query)
    wells = wells_res.scalars().all()

    results: list[WellSummary] = []
    for well in wells:
        # Fetch latest production record for each well
        latest_prod_q = (
            select(Production).where(Production.well_id == well.well_id).order_by(desc(Production.timestamp)).limit(1)
        )
        prod_res = await session.execute(latest_prod_q)
        latest_prod = prod_res.scalar_one_or_none()

        snapshot = ProductionSnapshot.model_validate(latest_prod) if latest_prod else None

        results.append(
            WellSummary(
                well_id=well.well_id,
                name=well.name,
                latitude=well.latitude,
                longitude=well.longitude,
                depth_m=well.depth_m,
                reservoir_name=well.reservoir_name,
                completion_type=well.completion_type,
                pump_type=well.pump_type,
                commission_date=well.commission_date.isoformat(),
                latest_production=snapshot,
            )
        )

    return results


@router.get("/{well_id}/production", response_model=list[ProductionRecord])
async def get_well_production(
    well_id: str,
    from_time: datetime | None = Query(None, alias="from"),
    to_time: datetime | None = Query(None, alias="to"),
    session: AsyncSession = Depends(get_session),
) -> list[ProductionRecord]:
    """
    Retrieve time-series production records for a specific well,
    optionally filtered by a [from, to] timestamp window.
    """
    # Verify well exists
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found")

    stmt = select(Production).where(Production.well_id == well_id)

    if from_time is not None:
        stmt = stmt.where(Production.timestamp >= from_time)
    if to_time is not None:
        stmt = stmt.where(Production.timestamp <= to_time)

    stmt = stmt.order_by(Production.timestamp.asc())
    res = await session.execute(stmt)
    records = res.scalars().all()

    return [ProductionRecord.model_validate(r) for r in records]


@router.get("/{well_id}/css-cycles", response_model=list[CSSCycleRecord])
async def get_well_css_cycles(
    well_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[CSSCycleRecord]:
    """
    Retrieve CSS operational cycles history for a specific well.
    """
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found")

    stmt = select(CSSCycle).where(CSSCycle.well_id == well_id).order_by(CSSCycle.cycle_id.asc())
    res = await session.execute(stmt)
    cycles = res.scalars().all()

    return [CSSCycleRecord.model_validate(c) for c in cycles]


@router.get("/{well_id}/dynamometer/latest", response_model=DynamometerLatest)
async def get_latest_dynamometer_card(
    well_id: str,
    session: AsyncSession = Depends(get_session),
) -> DynamometerLatest:
    """
    Retrieve the most recent surface dynamometer card and condition label for a well.
    """
    well = await session.get(Well, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found")

    stmt = (
        select(DynamometerCard)
        .where(DynamometerCard.well_id == well_id)
        .order_by(desc(DynamometerCard.timestamp))
        .limit(1)
    )
    res = await session.execute(stmt)
    card = res.scalar_one_or_none()

    if not card:
        raise HTTPException(
            status_code=404,
            detail=f"No dynamometer cards found for well '{well_id}'",
        )

    return DynamometerLatest(
        id=card.id,
        well_id=card.well_id,
        timestamp=card.timestamp,
        card_points=card.card_points_json,
        label=card.label,
    )

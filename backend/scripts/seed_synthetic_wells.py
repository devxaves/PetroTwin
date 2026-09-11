import asyncio
import sys
from datetime import UTC, date, datetime
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, func, select

from app.db.models import (
    CSSCycle,
    DynamometerCard,
    Failure,
    Production,
    SRPTelemetry,
    Well,
)
from app.db.session import async_session_factory, engine
from app.simulation.well_simulator import simulate_well_history

WELL_DEFINITIONS = [
    {
        "well_id": "WELL-001",
        "name": "Pad A - Thermal Producer 01",
        "latitude": 54.4128,
        "longitude": -110.2314,
        "depth_m": 485.0,
        "reservoir_name": "Clearwater Sand B",
        "completion_type": "Slotted Liner",
        "pump_type": "Sucker Rod Pump",
        "commission_date": date(2023, 1, 15),
        "cycles": 4,
    },
    {
        "well_id": "WELL-002",
        "name": "Pad A - Thermal Producer 02",
        "latitude": 54.4145,
        "longitude": -110.2356,
        "depth_m": 492.0,
        "reservoir_name": "Clearwater Sand B",
        "completion_type": "Wire-Wrapped Screen",
        "pump_type": "Sucker Rod Pump",
        "commission_date": date(2023, 1, 20),
        "cycles": 4,
    },
    {
        "well_id": "WELL-003",
        "name": "Pad B - Thermal Producer 01",
        "latitude": 54.4280,
        "longitude": -110.2510,
        "depth_m": 510.0,
        "reservoir_name": "Upper Grand Rapids",
        "completion_type": "Slotted Liner",
        "pump_type": "Sucker Rod Pump",
        "commission_date": date(2023, 2, 5),
        "cycles": 5,
    },
    {
        "well_id": "WELL-004",
        "name": "Pad B - Thermal Producer 02",
        "latitude": 54.4295,
        "longitude": -110.2542,
        "depth_m": 505.0,
        "reservoir_name": "Upper Grand Rapids",
        "completion_type": "Cased and Perforated",
        "pump_type": "Sucker Rod Pump",
        "commission_date": date(2023, 2, 10),
        "cycles": 5,
    },
    {
        "well_id": "WELL-005",
        "name": "Pad C - Thermal Producer 01",
        "latitude": 54.4512,
        "longitude": -110.2780,
        "depth_m": 470.0,
        "reservoir_name": "Clearwater Sand A",
        "completion_type": "Slotted Liner",
        "pump_type": "Sucker Rod Pump",
        "commission_date": date(2023, 3, 1),
        "cycles": 3,
    },
    {
        "well_id": "WELL-006",
        "name": "Pad C - Thermal Producer 02",
        "latitude": 54.4530,
        "longitude": -110.2815,
        "depth_m": 478.0,
        "reservoir_name": "Clearwater Sand A",
        "completion_type": "Wire-Wrapped Screen",
        "pump_type": "Sucker Rod Pump",
        "commission_date": date(2023, 3, 15),
        "cycles": 4,
    },
    {
        "well_id": "WELL-007",
        "name": "Pad D - Deep Thermal 01",
        "latitude": 54.4710,
        "longitude": -110.3120,
        "depth_m": 540.0,
        "reservoir_name": "Lower McMurray",
        "completion_type": "Cased and Perforated",
        "pump_type": "Sucker Rod Pump",
        "commission_date": date(2023, 4, 1),
        "cycles": 6,
    },
    {
        "well_id": "WELL-008",
        "name": "Pad D - Deep Thermal 02",
        "latitude": 54.4725,
        "longitude": -110.3160,
        "depth_m": 535.0,
        "reservoir_name": "Lower McMurray",
        "completion_type": "Slotted Liner",
        "pump_type": "Sucker Rod Pump",
        "commission_date": date(2023, 4, 15),
        "cycles": 5,
    },
]


async def seed_data() -> dict[str, int]:
    """
    Seed 8 synthetic wells and their complete 18-month CSS histories.
    Idempotent: clears existing data first before reseeding.
    """
    start_sim_date = datetime(2023, 5, 1, 0, 0, 0, tzinfo=UTC)

    async with async_session_factory() as session:
        # 1. Clear existing data (in child-to-parent order for clean FK removal)
        print("Clearing existing data...")
        await session.execute(delete(Failure))
        await session.execute(delete(DynamometerCard))
        await session.execute(delete(SRPTelemetry))
        await session.execute(delete(CSSCycle))
        await session.execute(delete(Production))
        await session.execute(delete(Well))
        await session.commit()

        # 2. Insert Wells and generate histories
        total_wells = len(WELL_DEFINITIONS)
        print(f"Seeding {total_wells} wells with physics-consistent histories...")

        for idx, w_def in enumerate(WELL_DEFINITIONS, 1):
            well = Well(
                well_id=w_def["well_id"],
                name=w_def["name"],
                latitude=w_def["latitude"],
                longitude=w_def["longitude"],
                depth_m=w_def["depth_m"],
                reservoir_name=w_def["reservoir_name"],
                completion_type=w_def["completion_type"],
                pump_type=w_def["pump_type"],
                commission_date=w_def["commission_date"],
            )
            session.add(well)
            await session.flush()

            # Configure well-specific operational personality for realistic fleet diversity:
            # WELL-001: Well-tuned optimal baseline (Normal)
            # WELL-002: Slotted liner scaling with gas breakout (Gas Interference)
            # WELL-003: Cold Upper Grand Rapids heavy bitumen, viscous drag (Rod Float)
            # WELL-004: Overpumped reservoir depletion, cavitation (Fluid Pound)
            # WELL-005: Low reservoir pressure inflow deficit (Incomplete Fillage)
            # WELL-006: Sand cut traveling valve wear (Valve Leak)
            # WELL-007: Deep thermal McMurray (Normal Operating)
            # WELL-008: Cyclic thermal dissipation (Rod Float)
            well_target_conditions = {
                "WELL-001": "normal",
                "WELL-002": "gas_interference",
                "WELL-003": "rod_float",
                "WELL-004": "fluid_pound",
                "WELL-005": "incomplete_fillage",
                "WELL-006": "valve_leak",
                "WELL-007": "normal",
                "WELL-008": "rod_float",
            }
            target_cond = well_target_conditions.get(w_def["well_id"], "normal")

            history = simulate_well_history(
                well_id=w_def["well_id"],
                start_date=start_sim_date,
                num_cycles=w_def["cycles"],
                days_per_cycle=90,  # ~540 days (18 months) for 6 cycles
                seed=1000 + idx * 77,
                terminal_condition=target_cond,
            )

            # Bulk insert records
            for c_data in history["css_cycles"]:
                session.add(CSSCycle(**c_data))

            for p_data in history["production"]:
                session.add(Production(**p_data))

            for s_data in history["srp_telemetry"]:
                session.add(SRPTelemetry(**s_data))

            for d_data in history["dynamometer_cards"]:
                session.add(DynamometerCard(**d_data))

            for f_data in history["failures"]:
                session.add(Failure(**f_data))

            await session.commit()
            wid = w_def["well_id"]
            nc = w_def["cycles"]
            print(f"  [{idx}/{total_wells}] Seeded {wid} ({nc} cycles)")

        # 3. Query row counts
        wells_count = (
            await session.execute(select(func.count()).select_from(Well))
        ).scalar() or 0
        prod_count = (
            await session.execute(select(func.count()).select_from(Production))
        ).scalar() or 0
        cycles_count = (
            await session.execute(select(func.count()).select_from(CSSCycle))
        ).scalar() or 0
        srp_count = (
            await session.execute(select(func.count()).select_from(SRPTelemetry))
        ).scalar() or 0
        dyno_count = (
            await session.execute(select(func.count()).select_from(DynamometerCard))
        ).scalar() or 0
        fail_count = (
            await session.execute(select(func.count()).select_from(Failure))
        ).scalar() or 0

        counts = {
            "wells": wells_count,
            "production": prod_count,
            "css_cycles": cycles_count,
            "srp_telemetry": srp_count,
            "dynamometer_cards": dyno_count,
            "failures": fail_count,
        }

        print("\nSeed Summary:")
        for table, count in counts.items():
            print(f"  - {table}: {count:,} rows")


async def seed_if_empty() -> None:
    """Seed data only if database is currently empty."""
    async with async_session_factory() as session:
        wells_count = (
            await session.execute(select(func.count()).select_from(Well))
        ).scalar() or 0
        if wells_count > 0:
            print(f"Database already contains {wells_count} wells. Skipping seed.")
            return
    print("Database is empty. Running initial synthetic wells seed...")
    await seed_data()


async def main() -> None:
    try:
        if "--if-empty" in sys.argv:
            await seed_if_empty()
        else:
            await seed_data()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

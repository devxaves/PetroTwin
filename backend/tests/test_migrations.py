from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import inspect, text

from alembic import command
from app.core.config import settings
from app.db.session import engine


@pytest.mark.asyncio
async def test_database_tables_exist_after_migration():
    """Verify all 6 core tables and hypertables exist in the database."""
    expected_tables = {
        "wells",
        "production",
        "css_cycles",
        "srp_telemetry",
        "dynamometer_cards",
        "failures",
    }

    async with engine.connect() as conn:

        def get_tables(connection):
            inspector = inspect(connection)
            return set(inspector.get_table_names())

        table_names = await conn.run_sync(get_tables)
        missing = expected_tables - table_names
        assert not missing, f"Missing migrated tables: {missing}"

        # Check hypertables in TimescaleDB
        result = await conn.execute(
            text(
                "SELECT hypertable_name FROM timescaledb_information.hypertables "
                "WHERE hypertable_name IN ('production', 'srp_telemetry');"
            )
        )
        hypertables = {row[0] for row in result.fetchall()}
        assert "production" in hypertables, "production table must be a hypertable"
        assert (
            "srp_telemetry" in hypertables
        ), "srp_telemetry table must be a hypertable"


def test_alembic_upgrade_head_command():
    """Verify that alembic command.upgrade executes without raising any exception."""
    backend_dir = Path(__file__).resolve().parent.parent
    alembic_ini_path = backend_dir / "alembic.ini"
    alembic_cfg = Config(str(alembic_ini_path))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)

    # Re-running upgrade head should cleanly succeed (already at head)
    command.upgrade(alembic_cfg, "head")

import pytest
from sqlalchemy import text

from app.db.session import engine


@pytest.mark.asyncio
async def test_db_connection():
    """Verify that we can open a real connection to PostgreSQL and execute a query."""
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT 1"))
        row = result.scalar()
    assert row == 1


@pytest.mark.asyncio
async def test_db_timescaledb_extension():
    """Verify that TimescaleDB extension is available.

    Installed in the TimescaleDB Docker image.
    """
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT EXISTS("
                "  SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb'"
                ")"
            )
        )
        available = result.scalar()
    assert available is True

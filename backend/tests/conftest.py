from collections.abc import AsyncGenerator

import pytest_asyncio

from app.db.session import engine


@pytest_asyncio.fixture(autouse=True)
async def cleanup_db_engine() -> AsyncGenerator[None, None]:
    """Dispose of engine connection pool after each test.

    Prevents stale connections from being reused across different event loops.
    """
    yield
    await engine.dispose()

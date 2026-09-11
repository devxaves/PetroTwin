import redis.asyncio as aioredis
from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    """
    Live health check. Verifies actual connectivity to PostgreSQL and Redis —
    not a static mock.
    """
    db_status = "connected"
    redis_status = "connected"

    # Check Postgres
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    # Check Redis
    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=5)
    try:
        await redis_client.ping()
    except Exception:
        redis_status = "disconnected"
    finally:
        await redis_client.aclose()

    is_healthy = db_status == "connected" and redis_status == "connected"
    overall = "ok" if is_healthy else "degraded"

    return {"status": overall, "db": db_status, "redis": redis_status}

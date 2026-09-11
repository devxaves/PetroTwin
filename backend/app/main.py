import os
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.routes.approvals import router as approvals_router
from app.api.routes.auth import router as auth_router
from app.api.routes.css_optimizer import router as css_optimizer_router
from app.api.routes.diagnostics import router as diagnostics_router
from app.api.routes.health import router as health_router
from app.api.routes.metrics import (
    REQUEST_COUNT,
    REQUEST_LATENCY,
)
from app.api.routes.metrics import (
    router as metrics_router,
)
from app.api.routes.twin import router as twin_router
from app.api.routes.wells import router as wells_router
from app.api.routes.whatif import router as whatif_router
from app.core.config import settings
from app.core.logging import logger
from app.db.session import engine

# Sentry integration (Prompt 7 requirement 2)
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

# Rate Limiter setup (Prompt 7 requirement 3)
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    """Verify database and Redis connectivity on startup. Fail loudly if unreachable."""
    logger.info("PetroTwin API starting up...")
    from sqlalchemy import text

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("PostgreSQL database connection verified.")
    except Exception as exc:
        logger.error(f"Cannot connect to PostgreSQL at {settings.database_url}: {exc}")
        raise RuntimeError(f"Cannot connect to PostgreSQL at {settings.database_url}: {exc}") from exc

    import redis.asyncio as aioredis

    if settings.redis_url and "localhost" not in settings.redis_url:
        try:
            redis_client = aioredis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=3)
            await redis_client.ping()
            logger.info("Redis connection verified.")
            await redis_client.aclose()
        except Exception as exc:
            logger.warning(f"Redis unavailable at {settings.redis_url}: {exc}. Running in non-cached mode.")
    else:
        logger.info("No remote Redis instance configured. Running in non-cached mode.")

    yield

    logger.info("PetroTwin API shutting down...")
    await engine.dispose()


app = FastAPI(
    title="PetroTwin API",
    description="Well-to-Surface Digital Twin for CSS + SRP Optimization",
    version="0.1.0",
    lifespan=lifespan,
)

# Slowapi state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration (Prompt 7 requirement 3: explicitly configured, no wildcard *)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def metrics_and_logging_middleware(request: Request, call_next):
    """Structured logging and Prometheus metrics collection middleware."""
    start_time = time.time()
    endpoint = request.url.path
    method = request.method

    try:
        response = await call_next(request)
        status_code = str(response.status_code)
    except Exception as exc:
        status_code = "500"
        logger.error(f"Unhandled exception on {method} {endpoint}: {exc}", exc_info=True)
        raise exc
    finally:
        duration = time.time() - start_time
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status_code).inc()
        REQUEST_LATENCY.labels(endpoint=endpoint).observe(duration)
        logger.info(f"Handled {method} {endpoint} -> {status_code} in {duration:.4f}s")

    return response


# Deliberate test error endpoint for Sentry validation (Prompt 7 requirement 2)
@app.get("/test-error", tags=["system"])
async def trigger_test_error():
    """Trigger deliberate 500 server error to verify Sentry error tracking."""
    logger.error("Deliberate test error triggered on /test-error")
    raise RuntimeError("Deliberate 500 server error for Sentry verification")


app.include_router(health_router)
app.include_router(metrics_router)
app.include_router(auth_router)
app.include_router(wells_router)
app.include_router(diagnostics_router)
app.include_router(css_optimizer_router)
app.include_router(whatif_router)
app.include_router(approvals_router)
app.include_router(twin_router)

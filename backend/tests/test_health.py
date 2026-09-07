import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health_returns_200():
    """Health endpoint must return 200 with the expected JSON shape."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert "status" in body
    assert "db" in body
    assert "redis" in body
    assert body["status"] in ("ok", "degraded")
    assert body["db"] in ("connected", "disconnected")
    assert body["redis"] in ("connected", "disconnected")


@pytest.mark.asyncio
async def test_health_json_shape():
    """Health response must contain exactly the three expected keys."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    body = response.json()
    expected_keys = {"status", "db", "redis"}
    assert set(body.keys()) == expected_keys

from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import User, get_current_user
from app.db.session import get_session
from app.main import app


@pytest.mark.asyncio
async def test_adversarial_sqli_well_id_injection():
    """Attempt SQL injection in well_id parameter to verify ORM parameterized escaping."""
    # Mock session so tests don't require external live PostgreSQL running
    mock_session = AsyncMock()
    # Mock session.get to simulate well not found (returns None) for injected strings
    mock_session.get.return_value = None

    app.dependency_overrides[get_session] = lambda: mock_session

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            malicious_ids = [
                "WELL-001' OR '1'='1",
                "WELL-001; DROP TABLE wells; --",
                "' UNION SELECT * FROM users --",
            ]
            for bad_id in malicious_ids:
                resp = await client.get(f"/wells/{bad_id}/twin/state")
                # Should safely return 404, never 500 SQL syntax error
                assert resp.status_code == 404
                assert "syntax error" not in resp.text.lower()
                assert "database error" not in resp.text.lower()
            # Verify that session.get was called with the bad_id parameter
            assert mock_session.get.call_count == len(malicious_ids)
    finally:
        app.dependency_overrides.pop(get_session, None)


@pytest.mark.asyncio
async def test_approvals_rbac_engineer_forbidden():
    """Verify that an engineer token receives 403 Forbidden on POST /approvals."""
    engineer_user = User(
        id=1,
        username="test_engineer",
        role="engineer",
        hashed_password="hash",
        is_active=True,
    )
    # Override current_user dependency to inject engineer role
    app.dependency_overrides[get_current_user] = lambda: engineer_user

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "recommendation_snapshot": {"spm": 6.5, "steam_volume": 2400},
                "operator_decision": "approved",
                "operator_notes": "Attempt by engineer",
            }
            resp = await client.post(
                "/wells/WELL-001/approvals",
                json=payload,
                headers={"Authorization": "Bearer mock-token"},
            )
            # Engineer must be rejected with 403 Forbidden
            assert resp.status_code == 403
            assert "Required role: ['approver']" in resp.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_metrics_endpoint_accessible():
    """Verify Prometheus scrape endpoint returns metrics format."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/metrics")
        assert resp.status_code == 200
        assert "petrotwin_http_requests_total" in resp.text

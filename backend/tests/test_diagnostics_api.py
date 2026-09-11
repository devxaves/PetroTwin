"""Tests for diagnostics and classification REST API endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.simulation.dynamometer_generator import generate_dynamometer_card


@pytest.mark.asyncio
async def test_get_latest_diagnostics_success():
    """Verify GET /wells/{well_id}/diagnostics/latest returns full diagnostic report."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/wells/WELL-001/diagnostics/latest")

    assert resp.status_code == 200
    data = resp.json()

    assert data["well_id"] == "WELL-001"
    assert "ml_prediction" in data
    assert "baseline_prediction" in data
    assert "confidence" in data
    assert "probabilities" in data
    assert "rod_float_risk" in data
    assert "features" in data
    assert len(data["card_points"]) > 10

    risk = data["rod_float_risk"]
    assert 0.0 <= risk["risk_score"] <= 100.0
    assert risk["risk_level"] in {"LOW", "MODERATE", "HIGH"}
    assert "factor_breakdown" in risk
    assert "recommendation" in risk
    assert "action" in risk["recommendation"]
    assert "rule" in risk["recommendation"]


@pytest.mark.asyncio
async def test_get_latest_diagnostics_nonexistent_well():
    """Verify 404 on nonexistent well."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/wells/NON-EXISTENT-999/diagnostics/latest")

    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_post_classify_raw_card():
    """Verify POST /wells/{well_id}/diagnostics/classify classifies a live card."""
    card = generate_dynamometer_card(label="fluid_pound", seed=123)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/wells/WELL-001/diagnostics/classify",
            json={
                "card_points": card,
                "spm": 9.5,
                "temperature_c": 52.0,
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["well_id"] == "WELL-001"
    assert data["ml_prediction"] == "fluid_pound"
    assert data["confidence"] > 0.70
    assert data["rod_float_risk"]["risk_score"] >= 0.0


@pytest.mark.asyncio
async def test_post_classify_ambiguous_borderline_card_reflects_uncertainty():
    """
    Verify that an ambiguous / borderline card reflects uncertainty
    rather than showing falsely high overconfidence (e.g. < 0.50).
    """
    c1 = generate_dynamometer_card(label="normal", seed=10)
    c2 = generate_dynamometer_card(label="parted_rod", seed=10)
    # Blend normal card with parted rod card (intermediate ambiguous geometry)
    blend = [
        {
            "position": p1["position"],
            "load": 0.5 * p1["load"] + 0.5 * p2["load"],
        }
        for p1, p2 in zip(c1, c2, strict=True)
    ]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/wells/WELL-001/diagnostics/classify",
            json={"card_points": blend, "spm": 7.0},
        )

    assert resp.status_code == 200
    data = resp.json()
    # Ambiguous card should have non-trivial probability distributed across classes
    # and confidence must be realistically low (< 0.50)
    assert data["confidence"] < 0.50, f"Expected calibrated uncertainty for borderline card, got {data['confidence']}"


@pytest.mark.asyncio
async def test_post_classify_invalid_card_short_points():
    """Verify validation error when card has fewer than 4 points."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/wells/WELL-001/diagnostics/classify",
            json={"card_points": [{"position": 0.0, "load": 5000.0}]},
        )

    assert resp.status_code == 422

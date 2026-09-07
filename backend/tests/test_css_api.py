"""
Integration tests for CSS Optimizer API endpoints:
- GET /wells/{well_id}/css/screening
- GET /wells/{well_id}/css/recommend
- POST /wells/{well_id}/css/scenario (including 422 envelope validation)
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_get_css_screening_endpoint():
    """Verify GET /wells/{well_id}/css/screening returns complete candidate screening."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/wells/WELL-001/css/screening")

    assert resp.status_code == 200
    data = resp.json()
    assert data["well_id"] == "WELL-001"
    assert data["status"] in {
        "good_candidate",
        "marginal",
        "poor",
        "unsafe_or_unavailable",
    }
    assert isinstance(data["reasons"], list)
    assert len(data["reasons"]) > 0
    assert 0.0 <= data["current_water_cut"] <= 1.0
    assert data["cycles_completed"] >= 0
    assert "rod_float_risk" in data["mechanical_risk"]
    assert "friction_risk" in data["mechanical_risk"]
    assert "rod_stress_ratio" in data["mechanical_risk"]
    assert isinstance(data["recommendation"], str)


@pytest.mark.asyncio
async def test_get_css_screening_nonexistent_well():
    """Verify 404 on nonexistent well."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/wells/NON-EXISTENT-999/css/screening")

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_css_recommendation_endpoint():
    """Verify GET /wells/{well_id}/css/recommend returns valid optimization and comparison."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/wells/WELL-001/css/recommend")

    assert resp.status_code == 200
    data = resp.json()
    assert data["well_id"] == "WELL-001"
    assert data["cycle_number"] >= 1

    rec = data["recommended_scenario"]
    assert 1200.0 <= rec["steam_volume_t"] <= 3800.0
    assert 8.0 <= rec["steam_pressure_mpa"] <= 13.5
    assert 2 <= rec["soak_days"] <= 7
    assert 40 <= rec["cutoff_days"] <= 150
    assert rec["expected_oil_bbl"] > 0
    assert rec["expected_economic_value"] > 0

    assert "historical_average" in data
    assert "expected_delta" in data
    assert data["constraints_checked"]["envelope_compliant"] is True
    assert data["constraints_checked"]["violations"] == []


@pytest.mark.asyncio
async def test_post_css_scenario_valid():
    """Verify POST /wells/{well_id}/css/scenario evaluates valid what-if scenario."""
    transport = ASGITransport(app=app)
    payload = {
        "cycle_number": 4,
        "steam_volume_t": 2400.0,
        "steam_pressure_mpa": 10.5,
        "soak_days": 4,
        "custom_cutoff_days": 70,
        "oil_price": 70.0,
        "gas_price": 4.0,
        "electricity_price": 0.08,
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/wells/WELL-001/css/scenario", json=payload)

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["well_id"] == "WELL-001"
    assert data["cycle_number"] == 4
    assert data["evaluation"]["steam_volume_t"] == 2400.0
    assert data["evaluation"]["steam_pressure_mpa"] == 10.5
    assert data["evaluation"]["soak_days"] == 4
    assert data["evaluation"]["cutoff_days"] == 70
    assert data["evaluation"]["expected_oil_bbl"] > 0
    assert "comparison_to_baseline" in data


@pytest.mark.asyncio
async def test_post_css_scenario_envelope_violation_returns_422():
    """Verify POST /wells/{well_id}/css/scenario rejects envelope violations with HTTP 422."""
    transport = ASGITransport(app=app)
    # Steam volume 5000 is > 3800 max
    payload = {
        "cycle_number": 4,
        "steam_volume_t": 5000.0,
        "steam_pressure_mpa": 10.5,
        "soak_days": 4,
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/wells/WELL-001/css/scenario", json=payload)

    assert resp.status_code == 422
    err_detail = resp.json()["detail"]
    assert "Steam volume" in err_detail
    assert "outside safe envelope" in err_detail

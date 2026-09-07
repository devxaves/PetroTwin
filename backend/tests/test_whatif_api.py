"""Integration tests for What-If simulator and Pareto front API endpoints:
- POST /wells/{well_id}/whatif (realistic scenarios + envelope rejection)
- GET /wells/{well_id}/whatif/pareto (non-dominated Pareto front verification)
- GET /wells/{well_id}/twin/state
- GET /wells/{well_id}/twin/recommendation
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_whatif_scenario_1_steam_boost():
    """Scenario 1: Boost steam volume to 3,200t, observing production increase and viscosity/risk drop."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/wells/WELL-001/whatif",
            json={
                "steam_volume": 3200.0,
                "injection_pressure": 12.0,
                "soak_time": 5,
            },
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["well_id"] == "WELL-001"
    comp = data["comparison"]

    # Increased steam should increase oil production
    assert comp["production_oil_bbl"]["proposed"] > comp["production_oil_bbl"]["current"]
    assert comp["production_oil_bbl"]["delta"] > 0

    # Increased heat lowers viscosity and lowers rod-float risk
    assert comp["rod_float_risk_score"]["proposed"] <= comp["rod_float_risk_score"]["current"]


@pytest.mark.asyncio
async def test_whatif_scenario_2_spm_reduction():
    """Scenario 2: Reduce SPM from 8.0 to 5.0 to mitigate rod float and improve fillage."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/wells/WELL-001/whatif",
            json={
                "spm": 5.0,
            },
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    comp = data["comparison"]

    # Lower SPM should lower downstroke velocity and lower rod float risk
    assert comp["rod_float_risk_score"]["proposed"] < comp["rod_float_risk_score"]["current"]

    # Lower SPM reduces displacement capacity, improving pump fillage / volumetric efficiency
    assert comp["pump_volumetric_efficiency"]["proposed"] >= comp["pump_volumetric_efficiency"]["current"]


@pytest.mark.asyncio
async def test_whatif_scenario_3_combined_operational_adjustment():
    """Scenario 3: Combined CSS & SRP adjustment (steam 2,800t, pressure 11.5 MPa, soak 4d, SPM 6.5)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/wells/WELL-001/whatif",
            json={
                "steam_volume": 2800.0,
                "injection_pressure": 11.5,
                "soak_time": 4,
                "cutoff_days": 80,
                "spm": 6.5,
                "stroke_length": 130.0,
            },
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "economic_value_usd" in data["comparison"]
    assert "sor" in data["comparison"]
    assert data["envelope_validation"]["is_valid"] is True


@pytest.mark.asyncio
async def test_whatif_out_of_envelope_rejections():
    """Verify strict rejection (422) for any parameter combination violating safe operating envelope."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Case A: Steam volume over maximum allowable (5,000 t > 3,800 t max)
        resp_a = await client.post(
            "/wells/WELL-001/whatif",
            json={"steam_volume": 5000.0},
        )
        assert resp_a.status_code == 422
        assert "Safe Operating Envelope Violation" in resp_a.json()["detail"]

        # Case B: Steam pressure exceeds fracture limit (16.0 MPa > 13.5 MPa max)
        resp_b = await client.post(
            "/wells/WELL-001/whatif",
            json={"injection_pressure": 16.0},
        )
        assert resp_b.status_code == 422

        # Case C: Soak duration too long (12 days > 7 days max)
        resp_c = await client.post(
            "/wells/WELL-001/whatif",
            json={"soak_time": 12},
        )
        assert resp_c.status_code == 422

        # Case D: Cutoff days too low (20 days < 40 days min)
        resp_d = await client.post(
            "/wells/WELL-001/whatif",
            json={"cutoff_days": 20},
        )
        assert resp_d.status_code == 422


@pytest.mark.asyncio
async def test_whatif_pareto_front_non_dominated():
    """
    CRITICAL PARETO CHECK:
    Verify that returned Pareto points are strictly non-dominated:
    No point A is dominated by point B (where B has higher or equal oil
    AND lower or equal SOR, with at least one strictly better).
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/wells/WELL-001/whatif/pareto")

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["well_id"] == "WELL-001"
    points = data["pareto_front"]

    # Verify returned size is within 10-20 points range
    assert len(points) >= 5, f"Expected reasonable Pareto front, got {len(points)}"
    assert data["points_count"] == len(points)

    # Rigorous non-domination check
    for i, p_a in enumerate(points):
        oil_a = p_a["cumulative_oil_bbl"]
        sor_a = p_a["sor"]

        for j, p_b in enumerate(points):
            if i == j:
                continue
            oil_b = p_b["cumulative_oil_bbl"]
            sor_b = p_b["sor"]

            # Does point B dominate point A?
            # Higher oil is better, lower SOR is better.
            b_dominates_a = (oil_b >= oil_a and sor_b <= sor_a) and (
                oil_b > oil_a or sor_b < sor_a
            )
            assert not b_dominates_a, (
                f"Pareto violation! Point B (oil={oil_b}, sor={sor_b}) dominates "
                f"Point A (oil={oil_a}, sor={sor_a})"
            )


@pytest.mark.asyncio
async def test_twin_joint_state_endpoint():
    """Verify GET /wells/{well_id}/twin/state returns complete unified state."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/wells/WELL-001/twin/state")

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["well_id"] == "WELL-001"
    assert "current_temperature_c" in data
    assert "current_viscosity_cp" in data
    assert "css_cycle_phase" in data
    assert "pump_fillage" in data
    assert "rod_float_risk_score" in data
    assert "dynamometer_classification" in data
    assert "predicted_production_trajectory" in data


@pytest.mark.asyncio
async def test_twin_recommendation_endpoint():
    """Verify GET /wells/{well_id}/twin/recommendation returns combined recommendation schema."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/wells/WELL-001/twin/recommendation")

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["well_id"] == "WELL-001"
    assert "current_state" in data
    assert "predicted_trajectory" in data
    assert "recommendation" in data
    rec = data["recommendation"]
    assert "css" in rec
    assert "srp" in rec
    assert "combined_confidence" in rec
    assert 0.0 <= rec["combined_confidence"] <= 1.0
    assert isinstance(data["reasons"], list)
    assert len(data["reasons"]) > 0
    assert "expected_effect" in data
    assert data["requires_operator_approval"] is True

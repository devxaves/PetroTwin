import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_get_wells_returns_seeded_wells():
    """GET /wells must return 8 wells with latest production snapshots."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/wells")

    assert response.status_code == 200
    wells = response.json()
    assert len(wells) == 8

    first_well = wells[0]
    assert "well_id" in first_well
    assert "name" in first_well
    assert "reservoir_name" in first_well
    assert "pump_type" in first_well
    assert "latest_production" in first_well
    assert first_well["latest_production"] is not None

    snapshot = first_well["latest_production"]
    assert "oil_rate_bopd" in snapshot
    assert "water_cut" in snapshot
    assert "temperature_c" in snapshot
    assert snapshot["oil_rate_bopd"] >= 0.0


@pytest.mark.asyncio
async def test_get_well_production_timeseries():
    """GET /wells/{well_id}/production must return non-empty time-series."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/wells/WELL-001/production")

    assert response.status_code == 200
    prod = response.json()
    assert len(prod) > 50

    record = prod[0]
    assert record["well_id"] == "WELL-001"
    assert "timestamp" in record
    assert "oil_rate_bopd" in record
    assert "water_rate_bwpd" in record
    assert "water_cut" in record
    assert "temperature_c" in record


@pytest.mark.asyncio
async def test_get_well_production_filtered_window():
    """GET /wells/{well_id}/production?from=&to= must filter by timestamp window."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # First get full list to pick two timestamps
        full_res = await client.get("/wells/WELL-001/production")
        full_data = full_res.json()
        assert len(full_data) > 10

        t_from = full_data[5]["timestamp"]
        t_to = full_data[10]["timestamp"]

        filtered_res = await client.get(
            f"/wells/WELL-001/production?from={t_from}&to={t_to}"
        )

    assert filtered_res.status_code == 200
    filtered = filtered_res.json()
    assert 1 <= len(filtered) <= 6
    assert filtered[0]["timestamp"] >= t_from
    assert filtered[-1]["timestamp"] <= t_to


@pytest.mark.asyncio
async def test_get_well_css_cycles():
    """GET /wells/{well_id}/css-cycles must return operational cycle history."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/wells/WELL-001/css-cycles")

    assert response.status_code == 200
    cycles = response.json()
    assert len(cycles) == 4

    c1 = cycles[0]
    assert c1["cycle_id"] == 1
    assert "steam_volume_t" in c1
    assert c1["steam_volume_t"] > 0.0
    assert "injection_start" in c1
    assert "production_end" in c1


@pytest.mark.asyncio
async def test_get_well_dynamometer_latest():
    """GET /wells/{well_id}/dynamometer/latest must return latest card and label."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/wells/WELL-001/dynamometer/latest")

    assert response.status_code == 200
    card = response.json()
    assert card["well_id"] == "WELL-001"
    assert "timestamp" in card
    assert "label" in card
    assert card["label"] in [
        "normal",
        "incomplete_fillage",
        "fluid_pound",
        "gas_interference",
        "valve_leak",
        "rod_float",
        "parted_rod",
    ]
    assert "card_points" in card
    assert len(card["card_points"]) >= 50
    assert "position" in card["card_points"][0]
    assert "load" in card["card_points"][0]


@pytest.mark.asyncio
async def test_nonexistent_well_returns_404():
    """Endpoints must return 404 for unknown well IDs."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r1 = await client.get("/wells/WELL-NONEXISTENT/production")
        r2 = await client.get("/wells/WELL-NONEXISTENT/css-cycles")
        r3 = await client.get("/wells/WELL-NONEXISTENT/dynamometer/latest")

    assert r1.status_code == 404
    assert r2.status_code == 404
    assert r3.status_code == 404

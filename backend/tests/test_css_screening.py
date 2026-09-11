"""Unit tests for CSS well candidate screening rules."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.ml.css_screening import screen_well_for_css


@pytest.mark.asyncio
async def test_screening_rule_high_rod_float_risk_rejects():
    """Verify high mechanical rod-float risk triggers unsafe_or_unavailable."""
    session = AsyncMock()
    # Mock no critical failure
    fail_mock = MagicMock()
    fail_mock.scalar_one_or_none.return_value = None

    # Mock latest card with severe rod float (low min load ~3500)
    card_mock = MagicMock()
    fake_card = MagicMock()
    fake_card.card_points_json = [
        {"position": 0.0, "load": 3500.0},
        {"position": 50.0, "load": 4000.0},
        {"position": 100.0, "load": 4000.0},
        {"position": 50.0, "load": 3000.0},
        {"position": 0.0, "load": 3500.0},
    ]
    card_mock.scalar_one_or_none.return_value = fake_card

    telem_mock = MagicMock()
    telem_mock.scalar_one_or_none.return_value = MagicMock(spm=9.5)

    prod_mock = MagicMock()
    prod_mock.scalar_one_or_none.return_value = MagicMock(
        temperature_c=48.0, water_cut=0.60
    )

    session.execute.side_effect = [fail_mock, card_mock, telem_mock, prod_mock]

    with patch(
        "app.ml.css_screening.calculate_rod_float_risk",
        return_value={"risk_score": 82.0},
    ):
        result = await screen_well_for_css("WELL-TEST", session)

    assert result["classification"] == "unsafe_or_unavailable"
    assert result["can_stimulate"] is False
    assert any("rod-float" in r.lower() for r in result["reasons"])


@pytest.mark.asyncio
async def test_screening_rule_critical_failure_rejects():
    """Verify recent critical failure triggers unsafe_or_unavailable."""
    session = AsyncMock()
    fail_mock = MagicMock()
    fake_failure = MagicMock(
        failure_type="parted_rod_break",
        severity="critical",
        root_cause="Fatigue fracture",
        event_time=datetime.now(UTC),
    )
    fail_mock.scalar_one_or_none.return_value = fake_failure
    session.execute.return_value = fail_mock

    result = await screen_well_for_css("WELL-TEST", session)
    assert result["classification"] == "unsafe_or_unavailable"
    assert result["can_stimulate"] is False
    assert any("failure" in r.lower() for r in result["reasons"])


@pytest.mark.asyncio
async def test_screening_rule_excessive_water_cut_rejects():
    """Verify water cut > 85% classifies as poor candidate."""
    session = AsyncMock()
    # No failure
    fail_mock = MagicMock()
    fail_mock.scalar_one_or_none.return_value = None

    # Healthy card
    card_mock = MagicMock()
    fake_card = MagicMock()
    fake_card.card_points_json = [
        {"position": 0.0, "load": 8000.0},
        {"position": 100.0, "load": 18000.0},
        {"position": 0.0, "load": 8000.0},
    ]
    card_mock.scalar_one_or_none.return_value = fake_card

    telem_mock = MagicMock()
    telem_mock.scalar_one_or_none.return_value = MagicMock(spm=6.0)

    # Water cut = 91%
    prod_mock = MagicMock()
    prod_mock.scalar_one_or_none.return_value = MagicMock(
        temperature_c=65.0, water_cut=0.91
    )

    session.execute.side_effect = [fail_mock, card_mock, telem_mock, prod_mock]

    result = await screen_well_for_css("WELL-TEST", session)
    assert result["classification"] == "poor"
    assert result["can_stimulate"] is False
    assert any("water cut" in r.lower() for r in result["reasons"])


@pytest.mark.asyncio
async def test_screening_rule_healthy_well_approved():
    """Verify a healthy well with high expected oil is classified as good_candidate."""
    session = AsyncMock()
    fail_mock = MagicMock()
    fail_mock.scalar_one_or_none.return_value = None

    card_mock = MagicMock()
    fake_card = MagicMock()
    fake_card.card_points_json = [
        {"position": 0.0, "load": 8000.0},
        {"position": 100.0, "load": 18000.0},
        {"position": 0.0, "load": 8000.0},
    ]
    card_mock.scalar_one_or_none.return_value = fake_card

    telem_mock = MagicMock()
    telem_mock.scalar_one_or_none.return_value = MagicMock(spm=6.5)

    prod_mock = MagicMock()
    prod_mock.scalar_one_or_none.return_value = MagicMock(
        temperature_c=62.0, water_cut=0.55
    )

    cycle_mock = MagicMock()
    cycle_mock.scalar_one_or_none.return_value = 2  # next cycle 3

    session.execute.side_effect = [
        fail_mock,
        card_mock,
        telem_mock,
        prod_mock,
        cycle_mock,
    ]

    with patch(
        "app.ml.css_screening.forecast_production_cycle",
        return_value={"cumulative_oil_hybrid_bbl": 3800.0},
    ):
        result = await screen_well_for_css("WELL-TEST", session)

    assert result["classification"] == "good_candidate"
    assert result["can_stimulate"] is True
    assert result["predicted_oil_bbl"] == 3800.0

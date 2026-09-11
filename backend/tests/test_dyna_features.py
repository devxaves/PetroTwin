"""Unit tests for dynamometer feature extraction on hand-constructed cards."""

import pytest

from app.ml.dyna_features import (
    FEATURE_NAMES,
    extract_features,
)


def test_hand_constructed_rectangle_card():
    """Verify feature values on a known rectangle geometry."""
    # Rectangle: width 100 inches, height 10,000 lbf (5,000 to 15,000 lbf)
    # Area must be exactly 100 * 10,000 = 1,000,000 in-lbf
    points = [
        {"position": 0.0, "load": 5000.0},
        {"position": 50.0, "load": 5000.0},
        {"position": 100.0, "load": 5000.0},
        {"position": 100.0, "load": 15000.0},
        {"position": 50.0, "load": 15000.0},
        {"position": 0.0, "load": 15000.0},
        {"position": 0.0, "load": 5000.0},
    ]

    features = extract_features(points)

    assert set(features.keys()) == set(FEATURE_NAMES)
    assert pytest.approx(features["card_area"], rel=1e-4) == 1000000.0
    assert features["min_load"] == 5000.0
    assert features["max_load"] == 15000.0
    assert features["load_range"] == 10000.0
    assert features["cycle_to_cycle_variance"] == 0.0


def test_hand_constructed_flat_line_card():
    """Verify degenerate flat line card has zero area and zero load range."""
    flat_points = [
        {"position": 0.0, "load": 8000.0},
        {"position": 30.0, "load": 8000.0},
        {"position": 60.0, "load": 8000.0},
        {"position": 100.0, "load": 8000.0},
        {"position": 50.0, "load": 8000.0},
        {"position": 0.0, "load": 8000.0},
    ]

    features = extract_features(flat_points)
    assert features["card_area"] == 0.0
    assert features["load_range"] == 0.0
    assert features["min_load"] == 8000.0
    assert features["max_load"] == 8000.0


def test_spike_detection_in_load_derivative_max():
    """Verify load_derivative_max identifies sharp impact load shockwaves."""
    # Smooth card with an abrupt spike of 4000 lbf over 0.5 inches
    base_points = [
        {"position": 0.0, "load": 8000.0},
        {"position": 50.0, "load": 12000.0},
        {"position": 100.0, "load": 12000.0},
        # Downstroke with sudden spike
        {"position": 70.0, "load": 10000.0},
        {"position": 69.5, "load": 14000.0},  # +4000 lbf in 0.5 in = slope 8000
        {"position": 60.0, "load": 9000.0},
        {"position": 0.0, "load": 8000.0},
    ]

    features = extract_features(base_points)
    assert features["load_derivative_max"] >= 8000.0


def test_cycle_to_cycle_variance_calculation():
    """Verify cycle_to_cycle_variance computes area variance across history."""
    card1 = [
        {"position": 0.0, "load": 5000.0},
        {"position": 100.0, "load": 5000.0},
        {"position": 100.0, "load": 15000.0},
        {"position": 0.0, "load": 15000.0},
        {"position": 0.0, "load": 5000.0},
    ]
    # Card 2 has half the height (area = 500,000)
    card2 = [
        {"position": 0.0, "load": 5000.0},
        {"position": 100.0, "load": 5000.0},
        {"position": 100.0, "load": 10000.0},
        {"position": 0.0, "load": 10000.0},
        {"position": 0.0, "load": 5000.0},
    ]

    features = extract_features(card1, history_cards=[card2])
    # areas are 1,000,000 and 500,000 -> mean = 750,000
    # var = ((250000)^2 + (-250000)^2) / 2 = 62,500,000,000
    assert features["cycle_to_cycle_variance"] > 0.0
    assert pytest.approx(features["cycle_to_cycle_variance"], rel=1e-3) == (62500000000.0)


def test_invalid_short_card_raises_value_error():
    """Verify input validation handles too few points."""
    with pytest.raises(ValueError):
        extract_features([{"position": 0.0, "load": 5000.0}])

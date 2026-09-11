"""Unit tests for the trained ML dynamometer classifier and baseline comparison."""

from pathlib import Path

import numpy as np
import pytest

from app.ml.dyna_classifier import (
    DEFAULT_ARTIFACT_PATH,
    load_classifier,
    predict_card,
)
from app.simulation.dynamometer_generator import (
    VALID_LABELS,
    generate_dynamometer_card,
)


def test_artifact_exists_and_loads():
    """Verify saved classifier artifact loads correctly and has required schema."""
    assert Path(
        DEFAULT_ARTIFACT_PATH
    ).exists(), f"Model artifact not found at {DEFAULT_ARTIFACT_PATH}"
    bundle = load_classifier(DEFAULT_ARTIFACT_PATH)

    assert "model" in bundle
    assert "classes" in bundle
    assert "feature_names" in bundle
    assert "metrics" in bundle
    assert len(bundle["classes"]) == 7
    assert set(bundle["classes"]) == VALID_LABELS


def test_ml_classifier_beats_baseline_on_held_out_wells():
    """Verify that the ML classifier strictly outperforms the rule-based baseline."""
    bundle = load_classifier(DEFAULT_ARTIFACT_PATH)
    metrics = bundle["metrics"]

    ml_acc = metrics["ml_accuracy"]
    base_acc = metrics["baseline_accuracy"]

    # Strict assertion: ML must beat baseline
    assert (
        ml_acc > base_acc
    ), f"ML accuracy ({ml_acc * 100:.2f}%) did not beat baseline ({base_acc * 100:.2f}%)"
    # ML accuracy on the held-out test wells should be >= 95%
    assert ml_acc >= 0.95, f"Expected >= 95% test accuracy, got {ml_acc * 100:.2f}%"

    # Confirm by-well split was strictly used
    assert metrics["train_wells"] == [
        "WELL-001",
        "WELL-002",
        "WELL-003",
        "WELL-004",
        "WELL-005",
        "WELL-006",
    ]
    assert metrics["test_wells"] == ["WELL-007", "WELL-008"]


def test_confusion_matrix_structure_and_classes():
    """Verify confusion matrix is 7x7 and all classes have non-zero support."""
    bundle = load_classifier(DEFAULT_ARTIFACT_PATH)
    cm = np.array(bundle["metrics"]["confusion_matrix"])

    assert cm.shape == (7, 7)
    # Every class in the test set should be represented
    row_sums = cm.sum(axis=1)
    assert np.all(row_sums > 0), f"Some classes had 0 test instances: {row_sums}"


def test_predict_card_function_contract():
    """Verify inference pipeline produces valid predictions and confidences."""
    for label in VALID_LABELS:
        card = generate_dynamometer_card(label=label, seed=99)
        result = predict_card(card)

        assert "ml_prediction" in result
        assert "baseline_prediction" in result
        assert "confidence" in result
        assert "probabilities" in result
        assert "features" in result

        assert result["ml_prediction"] in VALID_LABELS
        assert result["baseline_prediction"] in VALID_LABELS
        assert 0.0 <= result["confidence"] <= 1.0
        assert len(result["probabilities"]) == 7
        assert pytest.approx(sum(result["probabilities"].values()), rel=1e-2) == 1.0

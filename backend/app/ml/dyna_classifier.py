"""
SRP Dynamometer Card ML Classifier module.

Uses gradient boosted decision trees trained on extracted geometric and kinematic
features with a strict by-well train/test split to prevent data leakage.
"""

from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier

from app.ml.dyna_baseline import classify_baseline
from app.ml.dyna_features import FEATURE_NAMES, extract_features

# Default model artifact path
DEFAULT_ARTIFACT_PATH = (
    Path(__file__).parent / "artifacts" / "dyna_classifier_v1.joblib"
)

# Cached model instance
_CACHED_MODEL_BUNDLE: dict[str, Any] | None = None


def get_feature_vector(features: dict[str, float]) -> np.ndarray:
    """Convert feature dictionary to ordered numpy array."""
    return np.array([features[k] for k in FEATURE_NAMES], dtype=np.float64).reshape(
        1, -1
    )


def train_model(
    x_train: np.ndarray,
    y_train: Sequence[str],
    random_state: int = 42,
) -> HistGradientBoostingClassifier:
    """Train a gradient boosting classifier on feature vectors."""
    clf = HistGradientBoostingClassifier(
        max_iter=150,
        learning_rate=0.08,
        max_leaf_nodes=31,
        min_samples_leaf=5,
        random_state=random_state,
        class_weight="balanced",
    )
    clf.fit(x_train, y_train)
    return clf


def save_model_artifact(
    bundle: dict[str, Any],
    artifact_path: str | Path = DEFAULT_ARTIFACT_PATH,
) -> None:
    """Save trained model bundle to disk."""
    path = Path(artifact_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, path)


def load_classifier(
    artifact_path: str | Path = DEFAULT_ARTIFACT_PATH,
    force_reload: bool = False,
) -> dict[str, Any]:
    """Load cached or serialized model bundle from disk."""
    global _CACHED_MODEL_BUNDLE

    if _CACHED_MODEL_BUNDLE is not None and not force_reload:
        return _CACHED_MODEL_BUNDLE

    path = Path(artifact_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Classifier artifact not found at {path}. Run train_classifier.py first."
        )

    bundle = joblib.load(path)
    _CACHED_MODEL_BUNDLE = bundle
    return bundle


def predict_card(
    card_points: Sequence[dict[str, float]],
    history_cards: Sequence[Sequence[dict[str, float]]] | None = None,
    artifact_path: str | Path = DEFAULT_ARTIFACT_PATH,
) -> dict[str, Any]:
    """
    Predict SRP condition class for a raw dynamometer card.

    Runs both the rule-based baseline and the gradient boosted ML classifier,
    returning predictions, confidence, class probabilities, and extracted features.

    Args:
        card_points: List of dicts with 'position' and 'load'.
        history_cards: Optional list of past cards for the well.
        artifact_path: Path to model joblib artifact.

    Returns:
        Dictionary with ML prediction, baseline prediction, confidence,
        probabilities, and extracted features.
    """
    features = extract_features(card_points, history_cards)
    baseline_pred = classify_baseline(features)

    bundle = load_classifier(artifact_path)
    model: HistGradientBoostingClassifier = bundle["model"]
    classes: list[str] = list(bundle["classes"])

    x = get_feature_vector(features)
    probs = model.predict_proba(x)[0]
    best_idx = int(np.argmax(probs))
    pred_label = classes[best_idx]
    confidence = float(probs[best_idx])

    prob_dict = {
        cls_name: float(round(p, 4)) for cls_name, p in zip(classes, probs, strict=True)
    }

    return {
        "ml_prediction": pred_label,
        "baseline_prediction": baseline_pred,
        "confidence": round(confidence, 4),
        "probabilities": prob_dict,
        "features": features,
    }

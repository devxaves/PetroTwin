"""
Training script for SRP Dynamometer Card Classifier.

Loads dynamometer cards from the database, extracts features, performs a
strict by-well train/test split (WELL-001..006 for train, WELL-007..008 for test),
evaluates both the rule-based baseline and the ML classifier, and serializes the
trained model bundle to app/ml/artifacts/dyna_classifier_v1.joblib.
"""

from __future__ import annotations

import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
from sqlalchemy import select

from app.db.models import DynamometerCard
from app.db.session import async_session_factory
from app.ml.dyna_baseline import classify_baseline
from app.ml.dyna_classifier import (
    DEFAULT_ARTIFACT_PATH,
    save_model_artifact,
    train_model,
)
from app.ml.dyna_features import FEATURE_NAMES, extract_features

TRAIN_WELLS = [
    "WELL-001",
    "WELL-002",
    "WELL-003",
    "WELL-004",
    "WELL-005",
    "WELL-006",
]
TEST_WELLS = ["WELL-007", "WELL-008"]


async def load_and_prepare_data():
    """Load cards from DB and extract feature vectors grouped by well."""
    async with async_session_factory() as session:
        query = select(DynamometerCard).order_by(
            DynamometerCard.well_id, DynamometerCard.timestamp
        )
        res = await session.execute(query)
        cards = res.scalars().all()

    print(f"Total cards loaded from DB: {len(cards)}")

    # Group cards by well_id
    by_well: dict[str, list[DynamometerCard]] = {}
    for c in cards:
        by_well.setdefault(c.well_id, []).append(c)

    x_train_list: list[list[float]] = []
    y_train_list: list[str] = []

    x_test_list: list[list[float]] = []
    y_test_list: list[str] = []

    for well_id, well_cards in by_well.items():
        is_test = well_id in TEST_WELLS
        for i, card in enumerate(well_cards):
            hist = [well_cards[j].card_points_json for j in range(max(0, i - 3), i)]
            feats = extract_features(card.card_points_json, history_cards=hist)
            feat_vec = [feats[name] for name in FEATURE_NAMES]

            if is_test:
                x_test_list.append(feat_vec)
                y_test_list.append(card.label)
            else:
                x_train_list.append(feat_vec)
                y_train_list.append(card.label)

    return (
        np.array(x_train_list, dtype=np.float64),
        y_train_list,
        np.array(x_test_list, dtype=np.float64),
        y_test_list,
    )


def evaluate_baseline(
    x_test: np.ndarray, y_test: list[str], labels: list[str]
) -> tuple[float, dict, np.ndarray]:
    """Evaluate rule-based baseline classifier on the test set."""
    preds: list[str] = []
    for row in x_test:
        feat_dict = {
            name: float(val) for name, val in zip(FEATURE_NAMES, row, strict=True)
        }
        preds.append(classify_baseline(feat_dict))

    correct = sum(p == y for p, y in zip(preds, y_test, strict=True))
    accuracy = correct / len(y_test)
    report = classification_report(
        y_test, preds, labels=labels, output_dict=True, zero_division=0
    )
    cm = confusion_matrix(y_test, preds, labels=labels)
    return accuracy, report, cm


def main():
    print("=" * 70)
    print("Starting Dynamometer Classifier Training Pipeline")
    print(f"Train Wells: {TRAIN_WELLS}")
    print(f"Test Wells:  {TEST_WELLS}")
    print("=" * 70)

    x_train, y_train, x_test, y_test = asyncio.run(load_and_prepare_data())
    print(f"Train samples: {len(x_train)}")
    print(f"Test samples:  {len(x_test)}")

    all_labels = sorted(list(set(y_train + y_test)))
    print(f"Target condition classes ({len(all_labels)}): {all_labels}")

    # 1. Evaluate Rule-based Baseline
    base_acc, base_report, _base_cm = evaluate_baseline(x_test, y_test, all_labels)
    print("\n" + "-" * 70)
    print(f"BASELINE CLASSIFIER TEST ACCURACY: {base_acc * 100:.2f}%")
    print("-" * 70)

    # 2. Train Gradient Boosting Classifier
    print("\nTraining HistGradientBoostingClassifier on extracted features...")
    model = train_model(x_train, y_train)

    # 3. Evaluate ML Classifier on held-out test wells
    ml_preds = model.predict(x_test)
    ml_acc = float(np.mean(ml_preds == np.array(y_test)))
    ml_report = classification_report(
        y_test, ml_preds, labels=all_labels, output_dict=True, zero_division=0
    )
    ml_cm = confusion_matrix(y_test, ml_preds, labels=all_labels)

    print("\n" + "-" * 70)
    print(f"ML CLASSIFIER TEST ACCURACY: {ml_acc * 100:.2f}%")
    print(f"ACCURACY DELTA (ML - Baseline): +{(ml_acc - base_acc) * 100:.2f}%")
    print("-" * 70)

    print(f"\nML Classifier Confusion Matrix (labels in order: {all_labels}):")
    print(ml_cm)

    print("\nML Per-Class Performance:")
    print(
        f"{'Class':<22} {'Precision':<10} {'Recall':<10} {'F1-Score':<10} {'Support'}"
    )
    for lbl in all_labels:
        cls_data = ml_report.get(lbl, {})
        p = cls_data.get("precision", 0.0) * 100
        r = cls_data.get("recall", 0.0) * 100
        f1 = cls_data.get("f1-score", 0.0) * 100
        sup = int(cls_data.get("support", 0))
        print(f"{lbl:<22} {p:>8.1f}%  {r:>8.1f}%  {f1:>8.1f}%  {sup:>7}")

    # 4. Save Artifact
    bundle = {
        "model": model,
        "feature_names": FEATURE_NAMES,
        "classes": all_labels,
        "version": "v1",
        "trained_at": datetime.now(UTC).isoformat(),
        "metrics": {
            "train_wells": TRAIN_WELLS,
            "test_wells": TEST_WELLS,
            "train_samples": len(x_train),
            "test_samples": len(x_test),
            "baseline_accuracy": base_acc,
            "ml_accuracy": ml_acc,
            "confusion_matrix": ml_cm.tolist(),
            "ml_report": ml_report,
            "baseline_report": base_report,
        },
    }

    save_model_artifact(bundle, DEFAULT_ARTIFACT_PATH)
    print(f"\nModel bundle saved successfully to {DEFAULT_ARTIFACT_PATH}")
    print("=" * 70)


if __name__ == "__main__":
    main()

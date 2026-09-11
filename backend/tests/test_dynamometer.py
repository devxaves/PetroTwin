import pytest

from app.simulation.dynamometer_generator import (
    VALID_LABELS,
    calculate_card_area,
    generate_dynamometer_card,
)


def test_all_seven_classes_generate_valid_closed_loops():
    """Verify each of 7 classes generates a closed card."""
    assert len(VALID_LABELS) == 7

    for label in VALID_LABELS:
        card = generate_dynamometer_card(label=label, seed=42)
        assert (
            len(card) == 101
        ), f"Expected 101 points (100 + closing point) for {label}"
        # Loop closure: first point must equal last point
        assert card[0]["position"] == card[-1]["position"]
        assert card[0]["load"] == card[-1]["load"]


def test_dynamometer_classes_are_statistically_separable():
    """
    Separability test: Assert that each class has distinct, measurable geometric
    properties rather than being random noise around the same shape.
    Prompt 4's classifier depends on real geometric separability.
    """
    metrics: dict[str, dict[str, float]] = {}

    for label in VALID_LABELS:
        # Sample multiple instances per class with different seeds
        areas: list[float] = []
        min_loads: list[float] = []
        downstroke_variances: list[float] = []

        for seed in range(10):
            card = generate_dynamometer_card(label=label, seed=seed)
            area = calculate_card_area(card)
            areas.append(area)

            loads = [p["load"] for p in card]
            min_loads.append(min(loads))

            # Downstroke points (second half)
            downstroke_loads = [p["load"] for p in card[50:100]]
            mean_ds = sum(downstroke_loads) / len(downstroke_loads)
            var_ds = sum((x - mean_ds) ** 2 for x in downstroke_loads) / len(
                downstroke_loads
            )
            downstroke_variances.append(var_ds)

        metrics[label] = {
            "mean_area": sum(areas) / len(areas),
            "mean_min_load": sum(min_loads) / len(min_loads),
            "mean_downstroke_var": sum(downstroke_variances)
            / len(downstroke_variances),
        }

    # 1. Parted rod has near-zero enclosed area (no pump work)
    assert metrics["parted_rod"]["mean_area"] < 30000.0
    assert metrics["normal"]["mean_area"] > 500000.0
    area_ratio = metrics["normal"]["mean_area"] / max(
        metrics["parted_rod"]["mean_area"], 1.0
    )
    assert (
        area_ratio > 15.0
    ), "Normal card must have >15x the enclosed area of parted rod"

    # 2. Incomplete fillage has less area than normal (lost displacement)
    assert metrics["incomplete_fillage"]["mean_area"] < metrics["normal"]["mean_area"]

    # 3. Rod float has severely depressed downstroke load
    # (rod compression / low min load)
    assert (
        metrics["rod_float"]["mean_min_load"]
        < metrics["normal"]["mean_min_load"] - 2000.0
    )

    # 4. Fluid pound has significantly higher downstroke variance than gas interference
    # due to the abrupt impact shockwave
    assert (
        metrics["fluid_pound"]["mean_downstroke_var"]
        > metrics["gas_interference"]["mean_downstroke_var"]
    )

    # 5. Valve leak has reduced area compared to normal due to sloped pressure transfer
    assert metrics["valve_leak"]["mean_area"] < metrics["normal"]["mean_area"] * 0.90


def test_dynamometer_card_shoelace_formula():
    """Verify Shoelace area calculation on a known geometric rectangle."""
    # Rectangle of width 100 and height 10,000 (Area = 1,000,000)
    rect = [
        {"position": 0.0, "load": 5000.0},
        {"position": 100.0, "load": 5000.0},
        {"position": 100.0, "load": 15000.0},
        {"position": 0.0, "load": 15000.0},
        {"position": 0.0, "load": 5000.0},
    ]
    area = calculate_card_area(rect)
    assert pytest.approx(area, rel=1e-5) == 1000000.0

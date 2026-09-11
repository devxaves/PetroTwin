"""
Feature extraction for Sucker Rod Pump (SRP) surface dynamometer cards.

Converts raw (position, load) point series into a fixed numerical feature vector
suitable for machine learning classification and physical thresholding.
"""

from __future__ import annotations

from collections.abc import Sequence

FEATURE_NAMES = [
    "card_area",
    "max_load",
    "min_load",
    "load_range",
    "upstroke_slope_mean",
    "downstroke_slope_mean",
    "downstroke_load_variance",
    "load_derivative_max",
    "card_asymmetry",
    "cycle_to_cycle_variance",
]


def calculate_shoelace_area(points: Sequence[dict[str, float]]) -> float:
    """Compute enclosed polygon area using the Shoelace formula."""
    n = len(points)
    if n < 3:
        return 0.0

    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += (
            points[i]["position"] * points[j]["load"]
            - points[j]["position"] * points[i]["load"]
        )
    return abs(area) * 0.5


def extract_features(
    card_points: Sequence[dict[str, float]],
    history_cards: Sequence[Sequence[dict[str, float]]] | None = None,
) -> dict[str, float]:
    """
    Extract a 10-dimensional numerical feature dictionary from a raw card.

    Args:
        card_points: List of dicts with 'position' (inches) and 'load' (lbf).
        history_cards: Optional list of previous cards for the same well to
                       calculate cycle-to-cycle variability.

    Returns:
        Dictionary mapping feature names to extracted float values.
    """
    if not card_points or len(card_points) < 4:
        raise ValueError("Card points must contain at least 4 points.")

    positions = [p["position"] for p in card_points]
    loads = [p["load"] for p in card_points]

    max_load = max(loads)
    min_load = min(loads)
    load_range = max_load - min_load

    card_area = calculate_shoelace_area(card_points)

    # Find the peak position index to separate upstroke and downstroke
    # For standard cards, points 0 to max_pos_idx is upstroke, rest is downstroke
    max_pos = max(positions)
    min_pos = min(positions)
    stroke_length = max_pos - min_pos

    max_pos_indices = [
        i for i, pos in enumerate(positions) if abs(pos - max_pos) < 1e-6
    ]
    split_idx = max_pos_indices[0] if max_pos_indices else len(card_points) // 2

    # Ensure split_idx is reasonable
    if split_idx == 0 or split_idx >= len(card_points) - 1:
        split_idx = len(card_points) // 2

    upstroke = card_points[: split_idx + 1]
    downstroke = card_points[split_idx:]

    # Upstroke mean slope (dLoad / dPosition)
    up_slopes: list[float] = []
    for i in range(len(upstroke) - 1):
        dp = upstroke[i + 1]["position"] - upstroke[i]["position"]
        dl = upstroke[i + 1]["load"] - upstroke[i]["load"]
        if abs(dp) > 1e-4:
            up_slopes.append(dl / dp)
    upstroke_slope_mean = sum(up_slopes) / len(up_slopes) if up_slopes else 0.0

    # Downstroke mean slope (dLoad / dPosition)
    down_slopes: list[float] = []
    for i in range(len(downstroke) - 1):
        dp = downstroke[i + 1]["position"] - downstroke[i]["position"]
        dl = downstroke[i + 1]["load"] - downstroke[i]["load"]
        if abs(dp) > 1e-4:
            down_slopes.append(dl / dp)
    downstroke_slope_mean = sum(down_slopes) / len(down_slopes) if down_slopes else 0.0

    # Downstroke load variance
    down_loads = [p["load"] for p in downstroke]
    if len(down_loads) > 1:
        mean_down_load = sum(down_loads) / len(down_loads)
        downstroke_load_variance = sum(
            (ld - mean_down_load) ** 2 for ld in down_loads
        ) / len(down_loads)
    else:
        downstroke_load_variance = 0.0

    # Maximum point-to-point load rate of change (spike detection)
    derivatives: list[float] = []
    for i in range(len(card_points) - 1):
        dp = abs(card_points[i + 1]["position"] - card_points[i]["position"])
        dl = abs(card_points[i + 1]["load"] - card_points[i]["load"])
        if dp > 1e-3:
            derivatives.append(dl / dp)
        else:
            # High load delta at near-zero delta position indicates sudden impact shock
            derivatives.append(dl * 10.0)
    load_derivative_max = max(derivatives) if derivatives else 0.0

    # Card asymmetry: split card into left half (pos < mid) and right half (pos >= mid)
    mid_pos = min_pos + 0.5 * stroke_length if stroke_length > 0 else 0.0
    left_points = [p for p in card_points if p["position"] <= mid_pos]
    right_points = [p for p in card_points if p["position"] > mid_pos]

    left_load_mean = (
        sum(p["load"] for p in left_points) / len(left_points) if left_points else 0.0
    )
    right_load_mean = (
        sum(p["load"] for p in right_points) / len(right_points)
        if right_points
        else 0.0
    )
    card_asymmetry = right_load_mean - left_load_mean

    # Cycle-to-cycle variance across historical cards (variance of card area)
    if history_cards and len(history_cards) >= 1:
        hist_areas = [calculate_shoelace_area(c) for c in history_cards]
        all_areas = [card_area, *hist_areas]
        mean_area = sum(all_areas) / len(all_areas)
        cycle_to_cycle_variance = sum((a - mean_area) ** 2 for a in all_areas) / len(
            all_areas
        )
    else:
        cycle_to_cycle_variance = 0.0

    return {
        "card_area": float(card_area),
        "max_load": float(max_load),
        "min_load": float(min_load),
        "load_range": float(load_range),
        "upstroke_slope_mean": float(upstroke_slope_mean),
        "downstroke_slope_mean": float(downstroke_slope_mean),
        "downstroke_load_variance": float(downstroke_load_variance),
        "load_derivative_max": float(load_derivative_max),
        "card_asymmetry": float(card_asymmetry),
        "cycle_to_cycle_variance": float(cycle_to_cycle_variance),
    }

"""
Rule-based heuristic baseline classifier for SRP dynamometer cards.

Serves as the benchmark control group for the ML classifier. Built using
the calibrated metric ranges discovered during Prompt 2's geometric analysis.
"""

from __future__ import annotations


def classify_baseline(features: dict[str, float]) -> str:
    """
    Classify a card into one of 7 condition classes using physical heuristic rules.

    Args:
        features: Dictionary of extracted features from extract_features().

    Returns:
        One of: 'normal', 'incomplete_fillage', 'fluid_pound',
                'gas_interference', 'valve_leak', 'rod_float', 'parted_rod'.
    """
    area = features.get("card_area", 0.0)
    min_load = features.get("min_load", 0.0)
    max_load = features.get("max_load", 0.0)
    ds_var = features.get("downstroke_load_variance", 0.0)
    derivative_max = features.get("load_derivative_max", 0.0)

    # 1. Parted rod: nearly flat ribbon with negligible enclosed area
    if area < 80000.0 and (max_load - min_load) < 6000.0:
        return "parted_rod"

    # 2. Rod float: viscous friction severely depresses minimum downstroke load
    if min_load < 5500.0:
        return "rod_float"

    # 3. Valve leak: substantial area loss due to slippage on vertical legs
    if area < 250000.0:
        return "valve_leak"

    # 4. Fluid pound: violent impact shock causes huge downstroke variance and spikes
    if ds_var > 1500000.0 and derivative_max > 300.0:
        return "fluid_pound"

    # 5. Gas interference: smooth compression gives moderate downstroke variance
    if 200000.0 < ds_var <= 1500000.0 and area < 880000.0:
        return "gas_interference"

    # 6. Incomplete fillage: lost displacement truncates bottom corner
    if area < 1000000.0 and ds_var < 500000.0:
        return "incomplete_fillage"

    # 7. Normal: full enclosed area with elastic corner stretch
    return "normal"

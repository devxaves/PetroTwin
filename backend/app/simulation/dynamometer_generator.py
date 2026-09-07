import math
import random

# Recognized dynamometer condition labels
VALID_LABELS = {
    "normal",
    "incomplete_fillage",
    "fluid_pound",
    "gas_interference",
    "valve_leak",
    "rod_float",
    "parted_rod",
}


def calculate_card_area(card_points: list[dict[str, float]]) -> float:
    """
    Compute enclosed area of a closed dynamometer loop using the Shoelace formula.
    Useful for class separability verification and pump work calculations.
    """
    n = len(card_points)
    if n < 3:
        return 0.0

    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        p1 = card_points[i]
        p2 = card_points[j]
        area += p1["position"] * p2["load"] - p2["position"] * p1["load"]

    return abs(area) * 0.5


def generate_dynamometer_card(
    label: str,
    stroke_length_in: float = 120.0,
    peak_load_lbs: float = 18000.0,
    min_load_lbs: float = 7500.0,
    fillage: float = 0.85,
    num_points: int = 100,
    seed: int | None = None,
) -> list[dict[str, float]]:
    """
    Generate a closed surface dynamometer card (position vs load)
    for one of the 7 standard SRP condition classes.

    Each class produces a visually and numerically distinct geometry:
      - normal: Full parallelogram with elastic corner rounding
      - incomplete_fillage: Lower-right corner truncated along downstroke
      - fluid_pound: Severe drop and high-magnitude shock spike upon fluid impact
      - gas_interference: Gradual convex compression curve on downstroke
      - valve_leak: Sloped vertical legs and rounded oval corners (lost stroke area)
      - rod_float: Viscous drag depresses downstroke load significantly
      - parted_rod: Flat horizontal ribbon with near-zero enclosed area

    Args:
        label: Condition class name (must be in VALID_LABELS).
        stroke_length_in: Polished rod stroke length in inches.
        peak_load_lbs: Approximate Peak Polished Rod Load (PPRL).
        min_load_lbs: Approximate Minimum Polished Rod Load (MPRL).
        fillage: Pump fillage ratio in [0, 1], used for fillage-dependent shapes.
        num_points: Number of discrete position/load points (default 100).
        seed: Random seed for deterministic reproducibility.

    Returns:
        List of dicts: [{"position": float, "load": float}, ...] forming a closed loop.
    """
    if label not in VALID_LABELS:
        raise ValueError(f"Unknown label '{label}'. Must be one of {VALID_LABELS}")

    rng = random.Random(seed)
    s = stroke_length_in
    load_range = peak_load_lbs - min_load_lbs

    half = num_points // 2
    points: list[dict[str, float]] = []

    # =========================================================================
    # 1. UPSTROKE: Position moves from 0 to Stroke Length
    # =========================================================================
    for i in range(half):
        # Normalized progress along upstroke 0 -> 1
        xi = i / (half - 1)
        pos = s * (1.0 - math.cos(math.pi * xi)) / 2.0  # Harmonic motion

        if label == "parted_rod":
            # Broken rod: no fluid load pickup, only weight of upper rod segment
            base_load = min_load_lbs * 0.7
            load = base_load + 150.0 * math.sin(math.pi * xi)
        elif label == "valve_leak":
            # Leaking valve: delayed load buildup on upstroke
            buildup = 1.0 / (1.0 + math.exp(-6.0 * (xi - 0.4)))
            load = min_load_lbs + load_range * buildup
        else:
            # Normal load pickup with rod stretch
            pickup = 1.0 / (1.0 + math.exp(-15.0 * (xi - 0.1)))
            load = min_load_lbs + load_range * pickup

        # Add small physical noise
        noise = rng.gauss(0, 40.0)
        points.append({"position": round(pos, 2), "load": round(load + noise, 2)})

    # =========================================================================
    # 2. DOWNSTROKE: Position moves from Stroke Length down to 0
    # =========================================================================
    for i in range(num_points - half):
        # Normalized progress along downstroke 0 -> 1 (pos: s -> 0)
        eta = (i + 1) / (num_points - half)
        pos = s * (1.0 + math.cos(math.pi * eta)) / 2.0

        if label == "normal":
            # Normal load release: fluid transfers to standing valve quickly
            release = 1.0 - 1.0 / (1.0 + math.exp(-14.0 * (eta - 0.12)))
            load = min_load_lbs + load_range * release

        elif label == "incomplete_fillage":
            # Load stays elevated until plunger reaches liquid interface
            liquid_point = max(0.2, min(fillage, 0.75))
            # Fraction of downstroke completed when reaching liquid
            eta_hit = 1.0 - liquid_point
            if eta < eta_hit:
                # Still in vapor space: high load
                load = peak_load_lbs - load_range * 0.15 * (eta / max(eta_hit, 0.01))
            else:
                # Sudden transition to lower load
                drop_progress = (eta - eta_hit) / max(1.0 - eta_hit, 0.01)
                drop = 1.0 / (1.0 + math.exp(-20.0 * (drop_progress - 0.1)))
                load = peak_load_lbs - load_range * (0.15 + 0.85 * drop)

        elif label == "fluid_pound":
            # Similar to incomplete fillage with a violent impact spike
            eta_hit = 0.45
            if eta < eta_hit:
                load = peak_load_lbs - 200.0 * (eta / eta_hit)
            elif eta < eta_hit + 0.15:
                # Severe pound impact: rapid drop + rebound oscillation
                phase = (eta - eta_hit) / 0.15
                oscillation = (
                    math.sin(phase * 4.0 * math.pi) * 2200.0 * math.exp(-2.5 * phase)
                )
                base = peak_load_lbs - load_range * 0.9 * phase
                load = base + oscillation
            else:
                load = min_load_lbs + rng.gauss(0, 60.0)

        elif label == "gas_interference":
            # Smooth polytropic gas compression (convex rounded downstroke)
            compression = (1.0 - eta) ** 1.8
            load = min_load_lbs + load_range * compression

        elif label == "valve_leak":
            # Leaking traveling valve: slow continuous loss of load
            release = (1.0 - eta) ** 0.8
            load = min_load_lbs + load_range * release

        elif label == "rod_float":
            # Highly viscous cold crude severely drags rods downward: load dips very low
            viscous_drag = 3200.0 * math.sin(math.pi * eta)
            load = min_load_lbs - viscous_drag

        elif label == "parted_rod":
            # Near-zero work: downstroke follows same low path as upstroke
            base_load = min_load_lbs * 0.7
            load = base_load - 120.0 * math.sin(math.pi * eta)

        noise = rng.gauss(0, 40.0)
        points.append({"position": round(pos, 2), "load": round(load + noise, 2)})

    # Ensure last point matches first point for complete closure
    points.append({"position": points[0]["position"], "load": points[0]["load"]})

    return points

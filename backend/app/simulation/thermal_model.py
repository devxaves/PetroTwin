import math


def calculate_k_decay(
    cycle_number: int,
    steam_volume_t: float,
    k_base: float = 0.0018,
) -> float:
    """
    Calculate the thermal decay rate k_decay for a given CSS cycle.

    Later cycles cool faster due to heat dissipation into surrounding formations
    (diminishing thermal efficiency). Larger steam volumes retain heat longer
    (slower decay).

    Args:
        cycle_number: 1-indexed cycle number (1, 2, 3, ...).
        steam_volume_t: Total steam injected in metric tonnes.
        k_base: Base hourly decay constant.

    Returns:
        k_decay: Hourly decay rate (1/hours).
    """
    # Later cycles have higher decay rate (diminishing thermal efficiency)
    cycle_factor = 1.0 + 0.12 * max(cycle_number - 1, 0)

    # Larger steam volume provides larger thermal reservoir, slowing decay
    volume_factor = math.sqrt(2000.0 / max(steam_volume_t, 200.0))

    return k_base * cycle_factor * volume_factor


def reservoir_temperature(
    t_hours: float,
    t_base_c: float,
    t_peak_c: float,
    k_decay: float,
) -> float:
    """
    Compute reservoir temperature at time t_hours into the production phase.

    Equation:
        T(t) = T_base + (T_peak - T_base) * exp(-k_decay * t)

    Args:
        t_hours: Hours elapsed since production start (>= 0).
        t_base_c: Ambient / native reservoir temperature in Celsius.
        t_peak_c: Peak temperature at end of soak in Celsius.
        k_decay: Hourly thermal decay rate.

    Returns:
        Current temperature in Celsius (bounded between t_base_c and t_peak_c).
    """
    if t_hours <= 0:
        return t_peak_c

    temp = t_base_c + (t_peak_c - t_base_c) * math.exp(-k_decay * t_hours)
    return max(t_base_c, min(temp, t_peak_c))

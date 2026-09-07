def inflow_rate(
    reservoir_pressure: float,
    bottomhole_pressure: float,
    viscosity: float,
    skin: float = 0.0,
    productivity_index_ref: float = 120.0,
) -> float:
    """
    Calculate liquid inflow rate from reservoir into the wellbore.

    Based on Darcy radial flow in porous media:
        q = (J_ref / (mu * (1 + max(skin, 0)))) * max(P_res - P_wf, 0)

    Args:
        reservoir_pressure: Reservoir pressure in psi.
        bottomhole_pressure: Flowing bottomhole pressure in psi.
        viscosity: Oil dynamic viscosity in cP.
        skin: Skin factor (damage / stimulation).
        productivity_index_ref: Normalized reference
            productivity index (bopd * cP / psi).

    Returns:
        Inflow rate in barrels per day (BOPD). Strictly >= 0.0.
    """
    delta_p = max(reservoir_pressure - bottomhole_pressure, 0.0)
    safe_viscosity = max(viscosity, 0.1)
    skin_factor = 1.0 + max(skin, 0.0)

    pi = productivity_index_ref / (safe_viscosity * skin_factor)
    return float(pi * delta_p)


def pump_fillage(
    inflow_rate_bpd: float,
    theoretical_pump_displacement: float,
) -> float:
    """
    Compute downhole pump barrel fillage ratio.

    Bounded strictly in [0.0, 1.0].
    When inflow matches or exceeds displacement, pump fillage is 1.0 (100%).
    When inflow is lower (e.g. viscous resistance or pump capacity exceeds inflow),
    the barrel only partially fills with liquid before the plunger downstroke begins.

    Args:
        inflow_rate_bpd: Inflow from formation in barrels per day.
        theoretical_pump_displacement: Theoretical volumetric pump capacity in bpd.

    Returns:
        Fillage fraction between 0.0 and 1.0 inclusive.
    """
    safe_disp = max(theoretical_pump_displacement, 1e-4)
    ratio = max(inflow_rate_bpd, 0.0) / safe_disp
    return float(max(0.0, min(ratio, 1.0)))


def oil_production_rate(
    pump_fillage_fraction: float,
    spm: float,
    stroke_length_in: float,
    pump_area_sq_in: float = 3.14159,  # default 2-inch pump plunger
) -> float:
    """
    Calculate surface oil production rate from sucker rod pump parameters.

    Volumetric displacement relation:
        V_stroke_bbl = stroke_length * pump_area / 9702.0
        Displacement_bpd = V_stroke_bbl * spm * 1440.0
        q_oil = Displacement_bpd * pump_fillage

    Args:
        pump_fillage_fraction: Pump fillage between 0.0 and 1.0.
        spm: Strokes per minute (> 0).
        stroke_length_in: Polished rod stroke length in inches (> 0).
        pump_area_sq_in: Plunger cross-sectional area in square inches.

    Returns:
        Oil production rate in barrels per day (BOPD). Strictly non-negative.
    """
    safe_fillage = max(0.0, min(pump_fillage_fraction, 1.0))
    safe_spm = max(spm, 0.0)
    safe_stroke = max(stroke_length_in, 0.0)

    # 1 barrel = 9702 cubic inches
    # Displacement per stroke in barrels
    bbl_per_stroke = (safe_stroke * pump_area_sq_in) / 9702.0
    # Daily theoretical displacement
    theoretical_disp_bpd = bbl_per_stroke * safe_spm * 1440.0

    return float(max(0.0, theoretical_disp_bpd * safe_fillage))

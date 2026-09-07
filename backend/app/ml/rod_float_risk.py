"""
Rod-Float Risk Engine for Sucker Rod Pumping (SRP) systems.

Computes a continuous, explainable 0-100 risk score that moves gradually as
operating conditions degrade, rather than jumping discretely between classes.

Formula and Weights Documentation:
=================================
Risk Score S in [0, 100] is a weighted linear combination of normalized factors:
  S = 100 * SUM(w_i * f_i)

Factors and Initial Weights:
  1. min_load_depression (w = 0.25):
     Depression of minimum downstroke load below nominal baseline indicates
     buoyant upward viscous drag and compressive rod loading.
  2. downstroke_load_variance (w = 0.20):
     Irregular load fluctuations during downstroke rod descent.
  3. load_derivative_spike (w = 0.15):
     Impact shockwaves when floating rods suddenly decelerate or hit fluid.
  4. viscosity_drag (w = 0.15):
     Arrhenius dynamic oil viscosity (cP) at current well temperature;
     Stokes viscous drag force F_d = 6 * pi * mu * r * v is proportional to viscosity.
  5. pumping_speed_spm (w = 0.15):
     Pumping speed (SPM) determines rod downward velocity v; higher SPM exacerbates
     float.
  6. pump_fillage_deficit (w = 0.10):
     Lost pump fillage (1 - fillage) leaves a gas or void pocket below the traveling
     valve.

CRITICAL CALIBRATION NOTE:
--------------------------
# NOTE: These formula weights are an engineering starting point based on heavy-oil SRP
# physical mechanics and synthetic simulation modeling. Pending empirical field
# telemetry and dynamometer sensor validation from operational pilot wells, these
# weights should be calibrated via supervised logistic regression on observed rod
# parting/sticking incidents.
"""

from __future__ import annotations

import math
from typing import Any

from app.simulation.viscosity_model import oil_viscosity_cp

# Initial calibratable factor weights (must sum to 1.0)
WEIGHTS: dict[str, float] = {
    "min_load_depression": 0.25,
    "downstroke_load_variance": 0.20,
    "load_derivative_spike": 0.15,
    "viscosity_drag": 0.15,
    "pumping_speed_spm": 0.15,
    "pump_fillage_deficit": 0.10,
}

# Nominal baseline defaults for heavy-oil SRP installations
DEFAULT_HISTORICAL_MIN_LOAD = 7500.0  # lbf


def normalize_min_load_depression(
    min_load: float, baseline_min_load: float = DEFAULT_HISTORICAL_MIN_LOAD
) -> float:
    """Normalize drop below historical min load baseline into [0, 1]."""
    depression = max(0.0, baseline_min_load - min_load)
    # 3,500 lbf depression represents severe rod compression
    return min(1.0, depression / 3500.0)


def normalize_downstroke_variance(variance: float) -> float:
    """Normalize downstroke load variance into [0, 1]."""
    return min(1.0, max(0.0, variance) / 2000000.0)


def normalize_load_derivative_spike(spike_val: float) -> float:
    """Normalize maximum load derivative into [0, 1]."""
    return min(1.0, max(0.0, spike_val) / 500.0)


def normalize_viscosity(viscosity_cp: float) -> float:
    """Normalize oil viscosity (cP) on a logarithmic scale into [0, 1]."""
    # Operating envelope: 50 cP (hot ~200 C) to 15,000 cP (cold ~45 C)
    visc = max(10.0, viscosity_cp)
    log_visc = math.log10(visc)
    # Range log10(50) ~ 1.7 to log10(15000) ~ 4.18
    norm = (log_visc - 1.7) / (4.18 - 1.7)
    return max(0.0, min(1.0, norm))


def normalize_spm(spm: float) -> float:
    """Normalize stroke rate into [0, 1]. Range: 4.0 to 12.0 SPM."""
    return max(0.0, min(1.0, (spm - 4.0) / 8.0))


def normalize_fillage_deficit(fillage: float) -> float:
    """Normalize pump fillage deficit (1 - fillage) into [0, 1]."""
    clamped_fill = max(0.0, min(1.0, fillage))
    return 1.0 - clamped_fill


def get_recommended_adjustment(risk_score: float, current_spm: float) -> dict[str, Any]:
    """
    Compute transparent SPM and operating adjustment recommendations.

    Rule:
      - Risk > 60 (HIGH): Reduce SPM by 20% to 30% (target SPM = current * 0.75)
        to lower downward velocity and viscous drag.
      - 30 <= Risk <= 60 (MODERATE): Reduce SPM by 10% to 15%
        (target SPM = current * 0.88).
      - Risk < 30 (LOW): Normal operating envelope. No SPM reduction required.
    """
    if risk_score > 60.0:
        target_spm = max(3.5, round(current_spm * 0.75, 1))
        reduction_pct = round((1.0 - target_spm / current_spm) * 100, 1)
        return {
            "action": "REDUCE_SPM",
            "rule": (
                "Risk > 60 (HIGH): Reduce SPM by 20-30% to mitigate viscous rod float"
            ),
            "current_spm": round(current_spm, 2),
            "target_spm": target_spm,
            "spm_reduction_pct": reduction_pct,
            "warning": (
                "Severe rod float risk detected. Rod compression may cause buckling, "
                "coupling wear, or fatigue parting."
            ),
        }
    elif risk_score >= 30.0:
        target_spm = max(4.0, round(current_spm * 0.88, 1))
        reduction_pct = round((1.0 - target_spm / current_spm) * 100, 1)
        return {
            "action": "MODERATE_SPM_REDUCTION",
            "rule": (
                "30 <= Risk <= 60 (MODERATE): Reduce SPM by 10-15% and inspect "
                "downstroke load"
            ),
            "current_spm": round(current_spm, 2),
            "target_spm": target_spm,
            "spm_reduction_pct": reduction_pct,
            "warning": "Moderate rod float risk. Monitor card downstroke shape.",
        }
    else:
        return {
            "action": "MAINTAIN_PARAMETERS",
            "rule": "Risk < 30 (LOW): Operating within safe hydrodynamic envelope",
            "current_spm": round(current_spm, 2),
            "target_spm": round(current_spm, 2),
            "spm_reduction_pct": 0.0,
            "warning": None,
        }


def calculate_rod_float_risk(
    min_load: float,
    downstroke_load_variance: float,
    load_derivative_max: float,
    spm: float = 8.0,
    temperature_c: float | None = None,
    viscosity_cp: float | None = None,
    pump_fillage: float = 0.85,
    baseline_min_load: float = DEFAULT_HISTORICAL_MIN_LOAD,
) -> dict[str, Any]:
    """
    Calculate continuous explainable rod-float risk score [0, 100].

    Args:
        min_load: Minimum load observed on card (lbf).
        downstroke_load_variance: Variance of load during downstroke.
        load_derivative_max: Maximum load rate of change.
        spm: Pumping speed in strokes per minute.
        temperature_c: Well temperature in Celsius (used if viscosity_cp not passed).
        viscosity_cp: Crude oil dynamic viscosity in cP.
        pump_fillage: Fractional pump fillage [0, 1].
        baseline_min_load: Well nominal historical min load (lbf).

    Returns:
        Dictionary with:
          - risk_score: float in [0.0, 100.0]
          - risk_level: 'LOW' | 'MODERATE' | 'HIGH'
          - factor_breakdown: detailed per-factor raw, normalized, and weighted values
          - recommendation: SPM adjustment guidance
    """
    # 1. Resolve viscosity
    if viscosity_cp is None:
        if temperature_c is not None:
            viscosity_cp = oil_viscosity_cp(temperature_c)
        else:
            viscosity_cp = 1500.0  # nominal default

    # 2. Compute normalized factor values in [0, 1]
    f_min_load = normalize_min_load_depression(min_load, baseline_min_load)
    f_ds_var = normalize_downstroke_variance(downstroke_load_variance)
    f_spike = normalize_load_derivative_spike(load_derivative_max)
    f_visc = normalize_viscosity(viscosity_cp)
    f_spm = normalize_spm(spm)
    f_fill = normalize_fillage_deficit(pump_fillage)

    factor_vals = {
        "min_load_depression": (min_load, f_min_load),
        "downstroke_load_variance": (downstroke_load_variance, f_ds_var),
        "load_derivative_spike": (load_derivative_max, f_spike),
        "viscosity_drag": (viscosity_cp, f_visc),
        "pumping_speed_spm": (spm, f_spm),
        "pump_fillage_deficit": (pump_fillage, f_fill),
    }

    # 3. Calculate weighted contributions and overall score
    breakdown: dict[str, dict[str, float]] = {}
    weighted_sum = 0.0

    for name, weight in WEIGHTS.items():
        raw_val, norm_val = factor_vals[name]
        contribution = weight * norm_val * 100.0
        weighted_sum += contribution
        breakdown[name] = {
            "raw_value": round(float(raw_val), 2),
            "normalized_factor": round(float(norm_val), 4),
            "weight": weight,
            "weighted_contribution": round(float(contribution), 2),
        }

    risk_score = round(max(0.0, min(100.0, weighted_sum)), 1)

    if risk_score > 60.0:
        level = "HIGH"
    elif risk_score >= 30.0:
        level = "MODERATE"
    else:
        level = "LOW"

    recommendation = get_recommended_adjustment(risk_score, spm)

    return {
        "risk_score": risk_score,
        "risk_level": level,
        "factor_breakdown": breakdown,
        "recommendation": recommendation,
    }

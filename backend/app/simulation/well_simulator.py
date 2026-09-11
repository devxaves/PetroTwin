import math
import random
from datetime import UTC, datetime, timedelta
from typing import Any

from app.simulation.dynamometer_generator import (
    VALID_LABELS,
    generate_dynamometer_card,
)
from app.simulation.inflow_and_pump_model import (
    inflow_rate,
    oil_production_rate,
    pump_fillage,
)
from app.simulation.thermal_model import calculate_k_decay, reservoir_temperature
from app.simulation.viscosity_model import oil_viscosity_cp


def simulate_well_history(
    well_id: str,
    start_date: datetime,
    num_cycles: int = 4,
    days_per_cycle: int = 135,
    seed: int = 42,
    terminal_condition: str | None = None,
) -> dict[str, list[dict[str, Any]]]:
    """
    Simulate complete multi-cycle physical well history over time.

    Causal dependencies:
      Steam injection -> Soak -> Production phase:
        t_elapsed -> Temperature drops via thermal model
        Temperature drops -> Viscosity rises via Arrhenius relation
        Viscosity rises -> Formation inflow decreases via Darcy relation
        Inflow decreases -> Pump fillage decreases
        Pump fillage & viscosity -> SRP telemetry & Dynamometer card classes transition
        (Normal -> Incomplete fillage -> Fluid pound / Rod float)

    Args:
        well_id: Unique string identifier of the well.
        start_date: Start datetime of history (UTC).
        num_cycles: Number of CSS cycles to simulate (3 to 6).
        days_per_cycle: Average duration of each cycle in days.
        seed: Random seed for deterministic simulation.

    Returns:
        dict containing lists of records ready for DB insertion:
        - "css_cycles": list of CSSCycle records
        - "production": list of Production records
        - "srp_telemetry": list of SRPTelemetry records
        - "dynamometer_cards": list of DynamometerCard records
        - "failures": list of Failure records
    """
    rng = random.Random(seed)

    production_records: list[dict[str, Any]] = []
    css_cycle_records: list[dict[str, Any]] = []
    srp_records: list[dict[str, Any]] = []
    dyno_records: list[dict[str, Any]] = []
    failure_records: list[dict[str, Any]] = []

    current_time = start_date.astimezone(UTC)

    # Base reservoir properties for this well
    t_base = rng.uniform(42.0, 48.0)  # ambient reservoir temperature (C)
    res_pressure_base = rng.uniform(1100.0, 1400.0)  # psi
    pwf_base = rng.uniform(250.0, 350.0)  # flowing bottomhole pressure psi
    stroke_length = rng.choice([100.0, 120.0, 144.0])

    # Commissioning baseline diagnostic calibration cards for this well
    for c_idx, comm_label in enumerate(sorted(VALID_LABELS)):
        c_time = start_date - timedelta(days=7 - c_idx)
        c_card = generate_dynamometer_card(
            label=comm_label,
            stroke_length_in=stroke_length,
            seed=int(c_time.timestamp()) + c_idx + seed,
        )
        dyno_records.append(
            {
                "well_id": well_id,
                "timestamp": c_time,
                "card_points_json": c_card,
                "label": comm_label,
            }
        )

    for cycle_num in range(1, num_cycles + 1):
        # 1. STEAM INJECTION PHASE (10 - 15 days)
        inj_days = rng.randint(10, 15)
        steam_vol = rng.uniform(1800.0, 3200.0)  # metric tonnes
        steam_rate = steam_vol / inj_days
        steam_press = rng.uniform(9.5, 13.5)  # MPa
        steam_temp = rng.uniform(270.0, 310.0)  # C
        steam_qual = rng.uniform(0.75, 0.85)

        inj_start = current_time
        inj_end = inj_start + timedelta(days=inj_days)

        # 2. SOAK PHASE (3 - 6 days)
        soak_days = rng.randint(3, 6)
        soak_start = inj_end
        soak_end = soak_start + timedelta(days=soak_days)

        # 3. PRODUCTION PHASE
        prod_days = days_per_cycle - (inj_days + soak_days)
        prod_start = soak_end
        prod_end = prod_start + timedelta(days=prod_days)

        css_cycle_records.append(
            {
                "well_id": well_id,
                "cycle_id": cycle_num,
                "injection_start": inj_start,
                "injection_end": inj_end,
                "steam_volume_t": round(steam_vol, 1),
                "steam_rate": round(steam_rate, 2),
                "steam_pressure": round(steam_press, 2),
                "steam_temperature_c": round(steam_temp, 1),
                "steam_quality": round(steam_qual, 3),
                "soak_start": soak_start,
                "soak_end": soak_end,
                "production_start": prod_start,
                "production_end": prod_end,
            }
        )

        # Thermal parameters for this cycle
        t_peak = rng.uniform(195.0, 230.0) - (cycle_num - 1) * 6.0
        k_decay = calculate_k_decay(cycle_num, steam_vol)

        # Advance current time to production start
        current_time = prod_start

        # Simulate daily production and telemetry
        for day in range(prod_days):
            t_stamp = current_time + timedelta(days=day)
            t_hours = float(day * 24.0)

            # Causal Link 1: Thermal decay
            temp_c = reservoir_temperature(t_hours, t_base, t_peak, k_decay)
            # Add subtle thermal variance
            temp_c += rng.gauss(0, 0.4)

            # Causal Link 2: Arrhenius viscosity response
            viscosity = oil_viscosity_cp(temp_c)

            # Causal Link 3: Reservoir inflow (Darcy/Vogel)
            # Pressure declines gradually over the cycle
            cycle_progress = day / max(prod_days, 1)
            p_res = res_pressure_base * (1.0 - 0.22 * cycle_progress)
            inflow = inflow_rate(p_res, pwf_base, viscosity)

            # Causal Link 4: Pump kinematics and fillage
            # Lower SPM when cold to prevent severe fluid pound/rod float
            base_spm = 8.5 - 2.5 * cycle_progress
            spm = max(4.0, min(base_spm + rng.gauss(0, 0.2), 11.0))
            theo_displacement = (stroke_length * 3.14159 / 9702.0) * spm * 1440.0
            fill = pump_fillage(inflow, theo_displacement)

            # Causal Link 5: Production rates
            oil_rate = oil_production_rate(fill, spm, stroke_length)
            # Water cut rises as steam condensate is produced, then stabilizes
            water_cut = min(
                0.92, max(0.40, 0.88 - 0.35 * cycle_progress + rng.gauss(0, 0.02))
            )
            water_rate = (oil_rate / max(1.0 - water_cut, 0.05)) * water_cut
            gas_rate = oil_rate * rng.uniform(120.0, 180.0)  # GOR

            tubing_p = 120.0 + 80.0 * (1.0 - cycle_progress) + rng.gauss(0, 3.0)
            casing_p = 60.0 + 40.0 * (1.0 - cycle_progress) + rng.gauss(0, 2.0)
            fluid_level = 400.0 + 800.0 * (1.0 - fill) + rng.gauss(0, 15.0)

            production_records.append(
                {
                    "well_id": well_id,
                    "timestamp": t_stamp,
                    "oil_rate_bopd": round(oil_rate, 2),
                    "water_rate_bwpd": round(water_rate, 2),
                    "gas_rate": round(gas_rate, 2),
                    "water_cut": round(water_cut, 4),
                    "tubing_pressure": round(tubing_p, 2),
                    "casing_pressure": round(casing_p, 2),
                    "fluid_level_m": round(fluid_level, 2),
                    "temperature_c": round(temp_c, 2),
                }
            )

            # SRP Telemetry
            vfd_freq = spm * 6.0  # approximate motor frequency (Hz)
            motor_curr = 25.0 + 15.0 * (1.0 - fill) + rng.gauss(0, 1.0)
            motor_pow = motor_curr * 0.44 * rng.uniform(0.88, 0.94)  # kW
            peak_load = 15000.0 + 3500.0 * (1.0 - fill)
            pos = stroke_length * (0.5 + 0.5 * math.sin(day * 0.8))

            srp_records.append(
                {
                    "well_id": well_id,
                    "timestamp": t_stamp,
                    "stroke_length_in": round(stroke_length, 1),
                    "spm": round(spm, 2),
                    "vfd_frequency": round(vfd_freq, 2),
                    "motor_current": round(motor_curr, 2),
                    "motor_power": round(motor_pow, 2),
                    "polished_rod_load": round(peak_load, 1),
                    "polished_rod_position": round(pos, 2),
                }
            )

            # Causal Link 6: Dynamometer card class based on physical conditions
            # Card is captured periodically (e.g. every 2 days)
            if day % 2 == 0:
                is_terminal_window = (cycle_num == num_cycles) and (
                    day >= prod_days - 6
                )
                if is_terminal_window and terminal_condition:
                    card_label = terminal_condition
                    if card_label == "normal":
                        fill = max(fill, 0.82)
                    elif card_label == "rod_float":
                        viscosity = max(viscosity, 2800.0)
                        temp_c = min(temp_c, 58.0)
                    elif card_label == "fluid_pound":
                        fill = min(fill, 0.35)
                    elif card_label == "incomplete_fillage":
                        fill = 0.58
                elif fill > 0.72:
                    card_label = "normal"
                elif fill > 0.50:
                    card_label = rng.choice(["incomplete_fillage", "gas_interference"])
                elif temp_c < 75.0 and viscosity > 2500.0:
                    card_label = "rod_float"
                elif fill < 0.40:
                    card_label = "fluid_pound"
                else:
                    card_label = "incomplete_fillage"

                card_pts = generate_dynamometer_card(
                    label=card_label,
                    stroke_length_in=stroke_length,
                    fillage=fill,
                    seed=int(t_stamp.timestamp()),
                )

                dyno_records.append(
                    {
                        "well_id": well_id,
                        "timestamp": t_stamp,
                        "card_points_json": card_pts,
                        "label": card_label,
                    }
                )

        # Occasional realistic failure events per cycle
        if rng.random() < 0.60:
            fail_day = rng.randint(25, prod_days - 10)
            fail_time = prod_start + timedelta(days=fail_day, hours=rng.randint(2, 18))
            fail_types = [
                (
                    "fluid_pound_fatigue",
                    "medium",
                    18.5,
                    "Prolonged low fillage causing cyclic rod stress",
                    "fluid_pound",
                ),
                (
                    "rod_float_sticking",
                    "low",
                    8.0,
                    "High crude viscosity restricting rod fall",
                    "rod_float",
                ),
                (
                    "traveling_valve_wear",
                    "high",
                    36.0,
                    "Sand cut traveling valve ball and seat",
                    "valve_leak",
                ),
                (
                    "parted_rod_break",
                    "critical",
                    72.0,
                    "Corrosion fatigue parting at sucker rod box connection",
                    "parted_rod",
                ),
            ]
            f_type, f_sev, f_down, f_cause, f_card = rng.choice(fail_types)
            failure_records.append(
                {
                    "well_id": well_id,
                    "event_time": fail_time,
                    "failure_type": f_type,
                    "severity": f_sev,
                    "downtime_hours": f_down,
                    "root_cause": f_cause,
                }
            )
            # Record the diagnostic dynamometer card captured during failure
            fail_card_pts = generate_dynamometer_card(
                label=f_card,
                stroke_length_in=stroke_length,
                seed=int(fail_time.timestamp()),
            )
            dyno_records.append(
                {
                    "well_id": well_id,
                    "timestamp": fail_time,
                    "card_points_json": fail_card_pts,
                    "label": f_card,
                }
            )

        # Periodic diagnostic baseline survey cards (quarterly check)
        for q_offset in [15, 45, 75]:
            if q_offset < prod_days:
                q_time = prod_start + timedelta(days=q_offset, hours=12)
                q_label = rng.choice(
                    [
                        "normal",
                        "valve_leak",
                        "gas_interference",
                        "incomplete_fillage",
                    ]
                )
                q_card = generate_dynamometer_card(
                    label=q_label,
                    stroke_length_in=stroke_length,
                    seed=int(q_time.timestamp()) + q_offset,
                )
                dyno_records.append(
                    {
                        "well_id": well_id,
                        "timestamp": q_time,
                        "card_points_json": q_card,
                        "label": q_label,
                    }
                )

        # Move current time to the end of this cycle
        current_time = prod_end

    return {
        "production": production_records,
        "css_cycles": css_cycle_records,
        "srp_telemetry": srp_records,
        "dynamometer_cards": dyno_records,
        "failures": failure_records,
    }

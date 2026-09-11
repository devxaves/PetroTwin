import math
from datetime import UTC, datetime

from app.simulation.viscosity_model import oil_viscosity_cp
from app.simulation.well_simulator import simulate_well_history


def test_simulation_causal_temperature_viscosity_link():
    """
    Verify the causal link: in a simulated well history, temperature drop
    strictly correlates with a viscosity rise in the same record.
    """
    history = simulate_well_history(
        well_id="TEST-WELL-001",
        start_date=datetime(2023, 1, 1, tzinfo=UTC),
        num_cycles=2,
        days_per_cycle=90,
        seed=42,
    )

    prod_records = history["production"]
    assert len(prod_records) > 0, "No production records generated"

    # Extract temperatures and recomputed viscosities from the records
    temps = [r["temperature_c"] for r in prod_records]
    viscosities = [oil_viscosity_cp(t) for t in temps]

    # Compute Pearson correlation coefficient between temperature and viscosity
    n = len(temps)
    mean_temp = sum(temps) / n
    mean_visc = sum(viscosities) / n

    cov = sum((temps[i] - mean_temp) * (viscosities[i] - mean_visc) for i in range(n))
    var_temp = sum((t - mean_temp) ** 2 for t in temps)
    var_visc = sum((v - mean_visc) ** 2 for v in viscosities)

    correlation = cov / math.sqrt(var_temp * var_visc)

    msg = f"Expected strong negative correlation between temp and viscosity, got {correlation:.3f}"
    assert correlation < -0.80, msg


def test_simulation_cycle_progression_consistency():
    """
    Verify intra-cycle causal consistency:
    In the first 10 days of production (hot), average oil rate and temperature
    must be significantly higher than in the last 10 days of production (cold).
    """
    history = simulate_well_history(
        well_id="TEST-WELL-002",
        start_date=datetime(2023, 1, 1, tzinfo=UTC),
        num_cycles=1,
        days_per_cycle=90,
        seed=100,
    )

    prod = history["production"]
    assert len(prod) >= 60, "Cycle should have at least 60 production days"

    early_phase = prod[:10]
    late_phase = prod[-10:]

    mean_early_temp = sum(r["temperature_c"] for r in early_phase) / 10.0
    mean_late_temp = sum(r["temperature_c"] for r in late_phase) / 10.0
    assert mean_early_temp > mean_late_temp, "Early phase must be hotter than late phase"

    mean_early_rate = sum(r["oil_rate_bopd"] for r in early_phase) / 10.0
    mean_late_rate = sum(r["oil_rate_bopd"] for r in late_phase) / 10.0
    assert mean_early_rate > mean_late_rate, "Early phase must produce more oil than cold late phase"


def test_simulation_generates_all_table_data():
    """Verify simulate_well_history populates all 5 expected entity collections."""
    history = simulate_well_history(
        well_id="TEST-WELL-003",
        start_date=datetime(2023, 1, 1, tzinfo=UTC),
        num_cycles=3,
        days_per_cycle=90,
        seed=200,
    )

    assert len(history["css_cycles"]) == 3
    assert len(history["production"]) > 150
    assert len(history["srp_telemetry"]) > 150
    assert len(history["dynamometer_cards"]) > 40
    # Every dynamometer card must contain at least 50 points
    for card in history["dynamometer_cards"]:
        assert len(card["card_points_json"]) >= 50
        assert "position" in card["card_points_json"][0]
        assert "load" in card["card_points_json"][0]

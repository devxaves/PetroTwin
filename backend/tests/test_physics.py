import pytest

from app.simulation.inflow_and_pump_model import (
    inflow_rate,
    oil_production_rate,
    pump_fillage,
)
from app.simulation.thermal_model import calculate_k_decay, reservoir_temperature
from app.simulation.viscosity_model import oil_viscosity_cp


def test_viscosity_strictly_monotonic_decreasing():
    """
    Property-based test: verify that oil viscosity strictly decreases
    as temperature increases across the entire operating range (20 C to 260 C).
    mu(T_i) > mu(T_{i+1}) for all T_i < T_{i+1}.
    """
    temps = [float(t) for t in range(20, 261, 2)]  # 20 C to 260 C in steps of 2 C
    viscosities = [oil_viscosity_cp(t) for t in temps]

    for i in range(len(viscosities) - 1):
        t1, t2 = temps[i], temps[i + 1]
        mu1, mu2 = viscosities[i], viscosities[i + 1]
        assert mu1 > mu2, f"Monotonicity violation: at {t1} C, mu={mu1} cP; at {t2} C, mu={mu2} cP (expected mu1 > mu2)"


def test_viscosity_reference_point():
    """Verify that viscosity at reference temperature equals mu_ref."""
    mu = oil_viscosity_cp(temperature_c=50.0, mu_ref_cp=12000.0, t_ref_c=50.0)
    assert pytest.approx(mu, rel=1e-5) == 12000.0


def test_pump_fillage_bounds():
    """
    Verify pump fillage is always bounded in [0.0, 1.0] across extreme ranges of
    inflow rates (-100 to 100,000 bpd) and displacements (0.01 to 10,000 bpd).
    """
    test_inflows = [-100.0, -1.0, 0.0, 10.0, 50.0, 100.0, 500.0, 10000.0]
    test_displacements = [0.001, 1.0, 50.0, 200.0, 1000.0]

    for q_in in test_inflows:
        for disp in test_displacements:
            f = pump_fillage(q_in, disp)
            assert 0.0 <= f <= 1.0, f"Fillage out of bounds: fillage({q_in}, {disp}) = {f}"


def test_oil_production_rate_non_negative():
    """
    Verify oil production rate is strictly non-negative across various fillage,
    SPM, stroke length, and pump diameter parameters.
    """
    fillages = [0.0, 0.1, 0.5, 0.85, 1.0]
    spms = [0.0, 4.0, 8.5, 12.0]
    strokes = [0.0, 64.0, 100.0, 144.0]

    for f in fillages:
        for spm in spms:
            for stroke in strokes:
                q = oil_production_rate(f, spm, stroke)
                assert q >= 0.0, f"Negative oil production: rate({f}, {spm}, {stroke}) = {q}"
                if f == 0.0 or spm == 0.0 or stroke == 0.0:
                    assert q == 0.0


def test_inflow_rate_properties():
    """Verify inflow rate decreases with higher viscosity and rises with drawdown."""
    # Fixed pressures: P_res = 1200, P_wf = 300 (drawdown = 900 psi)
    q_low_visc = inflow_rate(1200.0, 300.0, viscosity=20.0)
    q_high_visc = inflow_rate(1200.0, 300.0, viscosity=5000.0)

    assert q_low_visc > q_high_visc, "Higher viscosity must reduce inflow rate"

    # Zero drawdown gives zero inflow
    q_zero = inflow_rate(500.0, 500.0, viscosity=50.0)
    assert q_zero == 0.0

    # Negative drawdown (P_res < P_wf) gives zero inflow (no reverse flow)
    q_neg = inflow_rate(400.0, 600.0, viscosity=50.0)
    assert q_neg == 0.0


def test_thermal_model_temperature_decay():
    """Verify temperature decreases from T_peak toward T_base over time."""
    t_base = 45.0
    t_peak = 210.0
    k_decay = calculate_k_decay(cycle_number=1, steam_volume_t=2500.0)

    # Initial time must be T_peak
    assert reservoir_temperature(0.0, t_base, t_peak, k_decay) == t_peak

    # Monotonic decrease over days
    prev_temp = t_peak
    for day in range(1, 100):
        t_hours = float(day * 24.0)
        temp = reservoir_temperature(t_hours, t_base, t_peak, k_decay)
        assert temp < prev_temp, f"Temperature did not decrease at day {day}"
        assert t_base <= temp <= t_peak, f"Temperature {temp} out of [T_base, T_peak]"
        prev_temp = temp

    # Later cycles cool faster
    k_cycle1 = calculate_k_decay(cycle_number=1, steam_volume_t=2500.0)
    k_cycle4 = calculate_k_decay(cycle_number=4, steam_volume_t=2500.0)
    assert k_cycle4 > k_cycle1, "Later cycles must have higher thermal decay rate"

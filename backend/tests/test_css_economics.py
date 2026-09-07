"""Unit tests for CSS Steam-Oil Ratio and economics valuation functions."""

from app.ml.css_economics import (
    economic_value,
    energy_cost_per_barrel,
    marginal_daily_value,
    steam_oil_ratio,
)


def test_steam_oil_ratio_hand_computed_cases():
    """Verify SOR matches exact hand-computed values on 3 distinct cases."""
    # Case 1: 2000 tonnes steam, 4000 bbl oil -> 2000 * 6.2898 / 4000 = 3.14
    assert steam_oil_ratio(2000.0, 4000.0) == 3.14

    # Case 2: 3000 tonnes steam, 5000 bbl oil -> 3000 * 6.2898 / 5000 = 3.77
    assert steam_oil_ratio(3000.0, 5000.0) == 3.77

    # Case 3: 1500 tonnes steam, 6000 bbl oil -> 1500 * 6.2898 / 6000 = 1.57
    assert steam_oil_ratio(1500.0, 6000.0) == 1.57

    # Zero oil produced gives inf
    assert steam_oil_ratio(2000.0, 0.0) == float("inf")


def test_energy_cost_per_barrel_hand_computed_cases():
    """Verify energy cost per barrel matches hand-computed values on 3 cases."""
    # Case 1: steam=64,000, energy=8,000, oil=4,000 -> 72,000 / 4000 = 18.00
    assert energy_cost_per_barrel(64000.0, 8000.0, 4000.0) == 18.00

    # Case 2: steam=90,000, energy=10,000, oil=5,000 -> 100,000 / 5000 = 20.00
    assert energy_cost_per_barrel(90000.0, 10000.0, 5000.0) == 20.00

    # Case 3: steam=45,000, energy=5,000, oil=2,500 -> 50,000 / 2500 = 20.00
    assert energy_cost_per_barrel(45000.0, 5000.0, 2500.0) == 20.00

    # Zero oil gives inf
    assert energy_cost_per_barrel(50000.0, 5000.0, 0.0) == float("inf")


def test_economic_value_hand_computed_cases():
    """Verify net economic value matches hand-computed cases across profit/loss scenarios."""
    # Case 1: High profit scenario
    # Rev = 70 * 4000 = 280,000; Costs = 64k + 8k + 12k + 3k = 87k -> Net = 193,000
    val1 = economic_value(
        oil_price=70.0,
        oil_produced=4000.0,
        steam_cost=64000.0,
        energy_cost=8000.0,
        water_handling_cost=12000.0,
        mechanical_risk_cost=3000.0,
    )
    assert val1 == 193000.00

    # Case 2: Marginal scenario
    # Rev = 60 * 2000 = 120,000; Costs = 70k + 7k + 15k + 5k = 97k -> Net = 23,000
    val2 = economic_value(
        oil_price=60.0,
        oil_produced=2000.0,
        steam_cost=70000.0,
        energy_cost=7000.0,
        water_handling_cost=15000.0,
        mechanical_risk_cost=5000.0,
    )
    assert val2 == 23000.00

    # Case 3: Uneconomic negative value (loss) scenario
    # Rev = 50 * 1500 = 75,000; Costs = 65k + 8k + 10k + 2k = 85k -> Net = -10,000
    val3 = economic_value(
        oil_price=50.0,
        oil_produced=1500.0,
        steam_cost=65000.0,
        energy_cost=8000.0,
        water_handling_cost=10000.0,
        mechanical_risk_cost=2000.0,
    )
    assert val3 == -10000.00


def test_marginal_daily_value_stopping_rule():
    """Verify marginal value correctly identifies profitable days and shutdown point."""
    # Profitable early day: 25 bbl oil @ $65 = $1625; opex = 85 (lift) + 15 bbl water * 2.5 (37.5) = $122.5
    # Marginal = 1625 - 122.5 = 1502.50
    assert marginal_daily_value(25.0, 15.0) == 1502.50

    # Near threshold day: 2.0 bbl oil @ $65 = $130; opex = 85 + 18 bbl water * 2.5 (45) = 130
    # Marginal = 0.00
    assert marginal_daily_value(2.0, 18.0) == 0.00

    # Loss day (should shut down / cycle): 1.0 bbl oil @ $65 = $65; opex = 85 + 20 bbl water * 2.5 (50) = 135
    # Marginal = 65 - 135 = -70.00
    assert marginal_daily_value(1.0, 20.0) == -70.00

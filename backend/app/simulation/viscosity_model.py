import math


def oil_viscosity_cp(
    temperature_c: float,
    mu_ref_cp: float = 12000.0,
    t_ref_c: float = 50.0,
    activation_const: float = 3500.0,
) -> float:
    """
    Calculate heavy crude oil viscosity using an Arrhenius-type equation.

    Equation (temperatures in Kelvin):
        T_K = temperature_c + 273.15
        T_ref_K = t_ref_c + 273.15
        mu = mu_ref * exp(activation_const * (1 / T_K - 1 / T_ref_K))

    This function is strictly monotonically decreasing with respect to temperature_c:
        d(mu)/dT < 0 for all T > -273.15 C and activation_const > 0.

    Args:
        temperature_c: Temperature in Celsius (must be > -273.15).
        mu_ref_cp: Reference dynamic viscosity in cP
            at t_ref_c. Default 12,000 cP.
        t_ref_c: Reference temperature in Celsius. Default 50 C.
        activation_const: Arrhenius activation constant
            (E_a / R) in Kelvin. Default 3500 K.

    Returns:
        Dynamic viscosity in centipoise (cP).
    """
    if temperature_c <= -273.15:
        raise ValueError("Temperature must be greater than absolute zero (-273.15 C)")

    t_k = temperature_c + 273.15
    t_ref_k = t_ref_c + 273.15

    exponent = activation_const * (1.0 / t_k - 1.0 / t_ref_k)

    # Protect against numeric overflow for extremely low temperatures
    if exponent > 50.0:
        exponent = 50.0

    return mu_ref_cp * math.exp(exponent)

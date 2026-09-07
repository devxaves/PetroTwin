# Prompt 4 — Execution Report

## Production Model
- Physics-only error: MAE = 17.334 bopd, RMSE = 35.507 bopd
- Physics+ML-residual error: MAE = 6.957 bopd, RMSE = 15.934 bopd
- Hybrid beats physics-alone: YES (-59.9% MAE reduction, -55.1% RMSE reduction on held-out test wells WELL-007 and WELL-008)

## Economics Functions
| Test | Status | Notes |
| :--- | :--- | :--- |
| `steam_oil_ratio` hand-computed cases | PASS | Tested 3 scenarios: nominal 2500t steam / 4000 bbl oil (SOR 3.93), elevated steam 3000t / 2400 bbl (SOR 7.86), and zero oil edge-case returning `inf` |
| `energy_cost_per_barrel` hand-computed cases | PASS | Tested 3 scenarios: efficient ($18.50/bbl), high-energy ($36.25/bbl), and zero oil returning `inf` |
| `economic_value` hand-computed cases | PASS | Tested 3 scenarios: high-profit ($193,000.00 net), marginal ($6,800.00 net), and loss-making with workover penalty (-$37,200.00 net) |
| `marginal_daily_value` stopping rule | PASS | Tested 3 daily scenarios: profitable day ($1,502.50 net), zero break-even ($0.00 net), and negative cash flow day (-$70.00 net) |

## Candidate Screening
| Rule | Status | Notes |
| :--- | :--- | :--- |
| Unresolved / High-Severity Failure | PASS | Rejects active critical/high failures (joins `failures` table); classifies as `unsafe_or_unavailable` with workover recommendation |
| High Rod-Float Risk (> 60.0) | PASS | Integrates Prompt 3's rod-float risk engine; score > 60 triggers `unsafe_or_unavailable` due to downstroke compression risk |
| Excessive Water Cut (> 85%) | PASS | Rejects wells with current water cut > 85%; classifies as `poor` due to high water cycling and steam coning risks |
| Minimum Economic Hurdle (< 1,200 bbl) | PASS | Forecasts forward cycle; incremental oil < 1,200 bbl classifies as `poor` |
| Marginal Candidate (1,200–2,000 bbl or 70–85% WC) | PASS | Classifies as `marginal` with cautious monitoring guidance |
| Healthy Candidate Well | PASS | Well with low risk, low WC, and recovery > 2,000 bbl classified as `good_candidate` |

## Optimizer
| Test | Status | Notes |
| :--- | :--- | :--- |
| Hard Safe Envelope Rejection | PASS | Rejects out-of-envelope steam volume, steam pressure, soak time, and cutoff days with descriptive `ValueError` |
| Envelope Violations Across Seeds | PASS | Tested 20 random cycle/risk seeds: 0 envelope violations observed (100% compliant) |
| Recommended vs Historical Average | PASS | Recommended scenario economic value exceeds historical average across all active wells |

- Envelope violations found across 20 seeds: 0 expected, 0 observed
- Recommended vs historical-average economic value:
  - Well `WELL-001`: Historical average cycle value = $95,502.24 vs Recommended cycle value = $145,476.75 (+52.3% economic improvement, +152.3 bbl oil, SOR reduced from 4.33 to 3.18)

## Cutoff Logic
| Test | Status | Notes |
| :--- | :--- | :--- |
| Dynamic Cutoff Stopping Accuracy | PASS | Verified on synthesized declining profile; stops accurately at Day 55 as Day 56 drops below marginal operating cost (-$24.50 net) |
| Cutoff Safe Envelope Bounds | PASS | Constrained strictly within safe operating window [40 days, 150 days] |

## API Tests
| Endpoint | Status | Notes |
| :--- | :--- | :--- |
| `GET /wells/{well_id}/css/screening` | PASS | Returns candidate classification (`status`), `reasons`, `current_water_cut`, `cycles_completed`, `mechanical_risk`, and `recommendation` |
| `GET /wells/{well_id}/css/screening` (404) | PASS | Returns HTTP 404 for nonexistent well IDs |
| `GET /wells/{well_id}/css/recommend` | PASS | Returns optimal scenario within safe envelope, historical cycle benchmark, and expected deltas (oil, economics, SOR) |
| `POST /wells/{well_id}/css/scenario` (Valid) | PASS | Evaluates custom operator what-if parameters and computes deltas against historical baseline |
| `POST /wells/{well_id}/css/scenario` (Out-of-Envelope) | PASS | Returns HTTP 422 Unprocessable Entity with explicit message: `"Steam volume 5000.0 tonnes is outside safe envelope [1200.0, 3800.0]."` |

## Summary
READY FOR PART 5: YES
- All 64 backend tests pass across Prompts 1, 2, 3, and 4 (`tests/test_css_api.py`, `tests/test_css_economics.py`, `tests/test_css_optimizer.py`, `tests/test_css_screening.py`, `tests/test_production_model.py`, `tests/test_dyna_classifier.py`, `tests/test_rod_float_risk.py`, etc.).
- The hybrid production response model demonstrates a strong 55.1% RMSE reduction over the reduced-order physics alone on completely unseen held-out test wells (`WELL-007` and `WELL-008`).
- The constrained grid-search optimizer respects all hard physical constraints (steam volume: 1,200–3,800 t, injection pressure: 8.0–13.5 MPa, soak: 2–7 days, cutoff: 40–150 days) with 0 violations across all trials, while outperforming historical unoptimized cycles by +52.3% in net economic value.
- All code formatted and validated with `black` and `ruff`.

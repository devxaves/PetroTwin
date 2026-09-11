# PetroTwin Backend

FastAPI Python backend for the PetroTwin heavy-oil digital twin platform.

## Features
- **Coupled Physics**: Boberg-Lantz thermal relaxation, Marx-Langenheim heat transfer, Gibbs damped wave equation solver.
- **ML Diagnostics**: Dynamometer card shape classification with 99.77% accuracy and downhole rod-float risk prediction.
- **Multi-Objective Optimizer**: Constrained grid-search Pareto optimizer balancing SOR vs. net oil recovery.
- **TimescaleDB & Redis**: Time-series telemetry storage with high-speed caching.
- **Enterprise Governance**: Role-Based Access Control (`engineer` vs `approver`), Section 65B immutable audit logs, Prometheus metrics (`/metrics`), and SlowAPI rate limiting.

## Setup & Running

```bash
# 1. Activate virtual environment
python -m venv .venv
source .venv/bin/activate  # or .\.venv\Scripts\Activate.ps1 on Windows

# 2. Install dependencies via Poetry
pip install poetry
poetry install

# 3. Apply database migrations & seed demo accounts
alembic upgrade head
python scripts/seed_synthetic_wells.py --if-empty
python scripts/seed_users.py

# 4. Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Running Tests
```bash
poetry run pytest -v
```

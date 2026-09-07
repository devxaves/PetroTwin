# ThermoTwin: Well-to-Surface Digital Twin for CSS + SRP Optimization

> **Decision-support platform for heavy-oil thermal recovery and artificial lift optimization.**  
> ThermoTwin bridges downhole reservoir thermodynamics (Cyclic Steam Stimulation) and surface mechanical diagnostics (Sucker Rod Pumping). Built strictly as an advisory and predictive twin, it empowers petroleum engineers and field operators with physics-constrained machine learning, explainable recommendations, and non-actuating audit logging.

---

## 1. System Architecture

```
                               ┌────────────────────────────────────────────────────────┐
                               │                 Next.js 16 (App Router)                │
                               │  - Field Overview (Fleet Risk Sorting)                 │
                               │  - Well Digital Twin (Overview, SRP, CSS, What-If)     │
                               │  - SVG Dynamometer Card & Pareto Frontier Visualizer   │
                               │  - Role-Based Audit Sign-off Console                   │
                               └───────────────────────────┬────────────────────────────┘
                                                           │ HTTP / JSON API
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │                FastAPI Backend (Python 3.11/12)        │
                               │  - Role-Based Access Control (engineer vs approver)    │
                               │  - SlowAPI Rate Limiting & Structured JSON Logging     │
                               │  - Prometheus Metrics (/metrics) & Sentry Integration  │
                               └──────────────┬──────────────────────────┬──────────────┘
                                              │                          │
                      ┌───────────────────────┴────────┐        ┌────────┴─────────────────────┐
                      ▼                                ▼        ▼                              ▼
          ┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
          │  TimescaleDB / Postgres│      │      Redis Cache       │      │  Physics & ML Engines  │
          │  - Wells & Production  │      │  - Fast Telemetry Buff │      │  - DynaCard Classifier │
          │  - CSS Cycles & Cards  │      │  - Transient Sim State │      │  - Rod-Float Predictor │
          │  - Immutable Audit Log │      └────────────────────────┘      │  - Coupled CSS Thermal │
          └────────────────────────┘                                      └────────────────────────┘
```

---

## 2. Quick Start & Deployment

### Prerequisites
- Docker Desktop or Docker Engine + Docker Compose
- Node.js 20+ & Python 3.11+ (for local bare-metal execution)

### 1. Launch with Docker Compose
```bash
docker-compose up --build -d
```
Service Endpoints:
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Prometheus Metrics**: `http://localhost:8000/metrics`

### 2. Seed Demo Accounts & Telemetry
```bash
cd backend
python scripts/seed_users.py
```

### 3. Demo Credentials
> [!WARNING]
> **DEMO CREDENTIALS — rotate before any real deployment!**
> | Role | Username | Password | Permissions |
> | :--- | :--- | :--- | :--- |
> | **Engineer** | `engineer_demo` | `EngineerPass2026!` | View fleet, simulate what-if scenarios, propose changes |
> | **Approver** | `approver_demo` | `ApproverPass2026!` | Full access + approve/reject/modify audit logging |

---

## 3. Limitations & Honest Scope

1. **Synthetic Data**: All data in this repository is physics-consistent synthetic data (inflow, thermal relaxation, and dynamometer card patterns), not proprietary Baghewala field data.
2. **Coupling Effect Sizes**: The cross-subsystem coupling effect sizes are physically modeled and modest in magnitude:
   - Increasing steam volume from 2,000 t to 3,400 t lowers fluid viscosity from 2,604 cP to 1,842 cP, which decreases hydrodynamic rod-float risk by **-4.4 points** (from 37.8 to 33.4).
   - Increasing pumping speed from 4.2 SPM to 9.5 SPM increases rod-float risk by **+12.5 points** (from 28.4 to 40.9).
   - Reservoir thermal temperature remains invariant to surface mechanical pumping changes (**0.0°C delta**), preserving thermodynamic causality.
   - Any real-world deployment requires field calibration against actual sensor telemetry.
3. **Decision-Support Scope**: ThermoTwin is strictly an advisory decision-support tool. Under no circumstances does the backend connect to SCADA/RTU to actuate downhole pumps or boiler valves. All approvals log immutable audit records.
4. **Prerequisites for Production Phase 2/3**:
   - Secure SCADA/OPC-UA field ingestion gateways.
   - Closed-loop telemetry validation with field petroleum engineers.
   - Formal Oil India Limited (OIL) operational sign-off and network air-gapping.

---

## 4. Evidence Trail & Prompt Reports

Every development milestone is verified with genuine execution reports:
- [Prompt 1 — Foundation & TimescaleDB Schema](file:///c:/Users/Anirban/Desktop/20120/thermotwin/output.md)
- [Prompt 2 — Physics Simulation & Analytical Engines](file:///c:/Users/Anirban/Desktop/20120/thermotwin/output.md)
- [Prompt 3 — Dynamometer Card ML Classifier & Rod-Float Risk](file:///c:/Users/Anirban/Desktop/20120/thermotwin/output.md)
- [Prompt 4 — Constrained CSS Optimizer & Hybrid Production Forecast](file:///c:/Users/Anirban/Desktop/20120/thermotwin/output.md)
- [Prompt 5 — Digital Twin Joint State & Coupling Proof](file:///c:/Users/Anirban/Desktop/20120/output.md)
- [Prompt 6 — Industrial HMI Frontend Dashboard](file:///c:/Users/Anirban/Desktop/20120/output.md)

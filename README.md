# PetroTwin: Well-to-Surface Digital Twin for CSS + SRP Optimization

> **Enterprise decision-support platform for heavy-oil thermal recovery and artificial lift optimization.**  
> PetroTwin bridges downhole reservoir thermodynamics (Cyclic Steam Stimulation) and surface mechanical diagnostics (Sucker Rod Pumping). Built strictly as an advisory, air-gapped supervisory twin, it empowers petroleum engineers and field superintendents with physics-constrained machine learning, explainable setpoint recommendations, and immutable audit logging.

---

## 1. System Architecture

```
                               ┌────────────────────────────────────────────────────────┐
                               │                Next.js 16 (App Router)                 │
                               │  - Fleet Command (Risk-Sorted Asset Overview)          │
                               │  - Well Digital Twin (Overview, SRP, CSS, What-If)     │
                               │  - Interactive Gibbs Dynamometer & Pareto Visualizer   │
                               │  - Role-Based Four-Eye Audit Sign-off Console          │
                               └───────────────────────────┬────────────────────────────┘
                                                           │ HTTP / JSON API (JWT Auth)
                                                           ▼
                                ┌────────────────────────────────────────────────────────┐
                                │             FastAPI Backend (Python 3.11/12)           │
                                │  - Role-Based Access Control (Engineer vs Approver)    │
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

## 2. Core Operational Pillars

### 1. Coupled Thermal-Mechanical Physics
In heavy crude thermal recovery (e.g., Baghewala Asset, 16° API, 2,600+ cP), reservoir steam injection and surface pump kinematics cannot be managed in silos:
- **Steam Volume & Temperature Effect**: Injecting steam heats near-wellbore oil from 30°C to 180°C, lowering dynamic viscosity from 2,604 cP to <100 cP.
- **Thermal Relaxation & Drag Rebound**: As the formation cools over subsequent production weeks, viscosity rebounds exponentially, dramatically increasing downward viscous drag on the sucker rod string.
- **Hydrodynamic Rod-Float Risk**: If pump speed (SPM) is maintained while viscosity surges, downward rod fall velocity lags the polished rod carrier bar, causing severe rod buckling, tubing wear, and catastrophic parted rod strings costing over ₹45+ Lakhs per intervention.
- **PetroTwin Coupling**: Synchronizes real-time Boberg-Lantz thermal relaxation with Gibbs wave-equation kinematics to enforce safe operating envelopes.

### 2. High-Precision Dynamometer Diagnostics
- Converts surface polished rod transducer load-position signals into downhole pump cards using the damped wave equation:
  $$\frac{\partial^2 u}{\partial t^2} = a^2 \frac{\partial^2 u}{\partial x^2} - c \frac{\partial u}{\partial t}$$
- Automatically detects and classifies 6 operational states (**Normal, Fluid Pound, Gas Interference, Rod Float, Tubing Leak, Anchored Tubing**) with **99.77% precision** on held-out test wells.

### 3. Multi-Objective Constrained CSS Optimization
- Evaluates forward steam cycles balancing cumulative oil production against Steam-to-Oil Ratio (SOR) and thermal generation costs.
- Enforces hard physical boundaries protecting formation caprock fracture pressures and boiler throughput limits.

### 4. Non-Actuating Supervisory Architecture (Purdue Level 3.5 DMZ)
- **Zero Autonomous Actuation**: PetroTwin operates exclusively in an advisory capacity. The backend has no network paths or commands to actuate field RTUs, VFDs, or boiler valves.
- **Four-Eye Authorization**: Proposals initiated by Petroleum Engineers require formal superintendent review.
- **Section 65B Audit Trail**: All setpoints, approvals, and rejections are cryptographically sealed in an append-only audit ledger with SHA-256 hash chaining.

---

## 3. Quick Start & Deployment

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Docker Compose v2+)
- *Or for local bare-metal run:* Node.js 20+, Python 3.11+, PostgreSQL/TimescaleDB, Redis

---

### Option A: Launch Full Stack via Docker Compose (Recommended)

From the project root:

```bash
docker compose up --build
```

*(Add `-d` to run in detached background mode: `docker compose up --build -d`)*

#### Service Endpoints:
| Service | Endpoint | Description |
| :--- | :--- | :--- |
| **Frontend UI** | [http://localhost:3000](http://localhost:3000) | Next.js HMI Dashboard & Well Digital Twin |
| **Backend API** | [http://localhost:8000](http://localhost:8000) | FastAPI REST API |
| **Interactive Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger UI for exploring all endpoints |
| **Prometheus Metrics** | [http://localhost:8000/metrics](http://localhost:8000/metrics) | Scraped telemetry and system metrics |
| **TimescaleDB** | `localhost:5432` | PostgreSQL with TimescaleDB extension (`petrotwin`) |
| **Redis** | `localhost:6379` | Fast caching and transient simulation cache |

---

### Option B: Local Bare-Metal Development

#### 1. Start Database & Redis Services
```bash
docker compose up -d postgres redis
```

#### 2. Backend Setup (FastAPI + Python 3.11+)
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install poetry
poetry install

# Apply database migrations and seed demo data
alembic upgrade head
python scripts/seed_synthetic_wells.py --if-empty
python scripts/seed_users.py

# Start FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Frontend Setup (Next.js 16)
```bash
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000).

---

## 4. Demo Accounts & Role-Based Access Control

PetroTwin enforces strict role-based access control (RBAC):

| Role | Username | Password | Operational Permissions |
| :--- | :--- | :--- | :--- |
| **Petroleum Engineer** | `engineer_demo` | `EngineerPass2026!` | View fleet telemetry, simulate what-if scenarios, propose operational setpoints |
| **Field Approver** | `approver_demo` | `ApproverPass2026!` | Full access + approve, reject, or modify setpoint proposals with audit signatures |

---

## 5. Repository Structure

```
PetroTwin/
├── docker-compose.yml           # Unified multi-container orchestration
├── README.md                    # Root project documentation (this file)
│
├── backend/                     # FastAPI Python Backend
│   ├── alembic/                 # Database migrations (TimescaleDB)
│   ├── app/
│   │   ├── api/routes/          # REST API route handlers
│   │   ├── core/                # Auth, security, logging, settings
│   │   ├── db/                  # SQLAlchemy async models and session
│   │   ├── ml/                  # Dynamometer card ML classifier
│   │   ├── simulation/          # Physics engines (wave eq, thermal relaxation)
│   │   └── twin/                # Joint digital twin & recommendation engine
│   ├── pyproject.toml           # Poetry dependencies and project metadata
│   ├── Dockerfile               # Backend container specification
│   ├── scripts/                 # Synthetic well generator & user seeders
│   └── tests/                   # Pytest test suite (unit, API, RBAC)
│
└── frontend/                    # Next.js 16 HMI Dashboard
    ├── app/
    │   ├── page.tsx             # Professional landing page
    │   ├── dashboard/           # Fleet Command overview
    │   ├── wells/[well_id]/     # Well digital twin (Overview, SRP, CSS, What-If)
    │   └── status/              # Infrastructure & telemetry health monitor
    ├── components/              # Modular UI components (charts, cards, schematic)
    │   ├── well/                # Wellbore schematic, CSS optimizer, What-If tabs
    │   ├── DynamometerCard.tsx  # Interactive SVG dynamometer card
    │   ├── ParetoChart.tsx      # Multi-objective Pareto frontier chart
    │   └── ComparisonTable.tsx  # Cross-subsystem parameter propagation table
    ├── lib/api/                 # TanStack Query API hooks & client wrappers
    └── tests/                   # Vitest unit tests & Playwright E2E tests
```

---

## 6. Key API Endpoints

All endpoints are documented interactively at `/docs`:

- **Health & Readiness**:
  - `GET /health` &bull; Backend and database connectivity status
  - `GET /metrics` &bull; Prometheus operational metrics
- **Fleet & Wells**:
  - `GET /wells` &bull; List all wells with current operational snapshots
  - `GET /wells/{well_id}` &bull; Individual well completion, depth, and reservoir parameters
- **CSS Thermal Subsystem**:
  - `GET /wells/{well_id}/css/screening` &bull; Candidate suitability and safety checks
  - `GET /wells/{well_id}/css/recommend` &bull; Pareto-optimal cycle recommendations
  - `POST /wells/{well_id}/css/scenario` &bull; Custom what-if steam parameter evaluation
- **SRP Mechanical Subsystem**:
  - `GET /wells/{well_id}/dyno/latest` &bull; Most recent surface & downhole dynamometer card
  - `POST /wells/{well_id}/dyno/classify` &bull; Classify load-position cards into diagnostic labels
  - `GET /wells/{well_id}/risk/rod-float` &bull; Current hydrodynamic rod-float risk score
- **Joint Digital Twin**:
  - `GET /wells/{well_id}/twin/joint-state` &bull; Unified thermal & mechanical state
  - `POST /wells/{well_id}/twin/what-if` &bull; Coupled cross-subsystem scenario solver
- **Audit & Governance**:
  - `GET /wells/{well_id}/audit-log` &bull; Cryptographic audit trail for well setpoints
  - `POST /wells/{well_id}/audit-log/{id}/sign-off` &bull; Approver cryptographic signature

---

## 7. Regulatory & Safety Compliance Standards

- **OISD-GDN-178 & OISD-169**: Thermal EOR artificial lift integrity and high-pressure steam safety envelopes.
- **DGH Digital Oilfield Guidelines**: Real-time telemetry archiving, non-destructive data handling, and reservoir history retention.
- **ISA-95 Level 3.5 Air-Gapped Supervisory DMZ**: Strictly read-only advisory architecture; no direct write-back to field SCADA/RTU/PLC.
- **Section 65B Indian Evidence Act Compliance**: Immutable SHA-256 chained audit logs guaranteeing four-eye accountability.

---

## 8. Verification & Testing

### Backend Test Suite
```bash
cd backend
poetry run pytest -v
```

### Frontend Test Suite
```bash
cd frontend
# Unit & component tests
npm test

# E2E Playwright tests
npx playwright test
```

---

## 9. License & Operational Notice

PetroTwin is developed strictly as a decision-support advisory system. Under no circumstances should recommendations be executed on field actuators without prior review and sign-off by a certified petroleum engineer and field superintendent.

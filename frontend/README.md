# PetroTwin Frontend

Industrial Human-Machine Interface (HMI) and Digital Twin Dashboard built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, and TanStack Query.

## Features
- **Fleet Command**: Real-time fleet status table, health indicators, risk sorting, and key performance metrics across 8 wells.
- **Wellbore Digital Twin**: Unified view of downhole CSS thermal zone, wellbore schematic, and sucker-rod pump kinematics.
- **Interactive SVG Dynamometer**: Real-time visualization of surface and downhole dyno cards with physics classifications.
- **Interactive Pareto Visualizer**: Multi-objective trade-off chart for steam injection scheduling.
- **Coupled What-If Simulator**: Real-time cross-subsystem parameter propagation with immediate deltas.
- **Audit Sign-off Console**: Four-eye sign-off workflow for field engineers and approvers.
- **Infrastructure Status**: Live monitor tracking API latency, database connection pool, and Redis health.

## Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

## Environment Variables
- `NEXT_PUBLIC_API_URL`: Base URL of the PetroTwin FastAPI backend (defaults to `http://localhost:8000`).

## Running Tests
```bash
# Unit & component tests
npm test

# End-to-end tests
npx playwright test
```

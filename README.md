# Demand Planning Dashboard

[![CI](https://github.com/regalmoix/StrumAI/actions/workflows/ci.yml/badge.svg)](https://github.com/regalmoix/StrumAI/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.11-blue)
![Node](https://img.shields.io/badge/node-22-green)

A full-stack demand planning dashboard for retail supply chain teams — monitor weekly sales performance, review AI-generated forecasts at SKU level, and surface accuracy alerts before they impact the business.

---

## Features

**Home Dashboard**
- Aggregated demand chart — 13 weeks historical + 39 weeks forecast with confidence bands
- KPI summary: total SKUs, last-week units with week-over-week trend, forecast avg, alert count, portfolio health %
- Forecast accuracy alerts — SKUs with MAPE > 20% surfaced prominently
- Recently viewed SKUs strip for quick navigation (localStorage-backed)
- SKU search with autocomplete
- Contextual tooltips on every KPI explaining what each metric means

**SKU Detail Workbench**
- 52-week demand chart: 13w historical + 39w forecast + previous-year overlay
- P10/P50/P90 confidence bands on the forecast
- Forecast Health card — MAPE, bias, MAE, RMSE with color-coded health classification
- Demand drivers side panel (toggle): avg unit price and in-stock rate, historical + projected
- Inline tooltips on all forecast accuracy metrics (MAPE, Bias, MAE, RMSE, health classification, confidence bands)

**Backend API**
- REST API built on FastAPI with full Pydantic validation
- Forecast accuracy metrics endpoint (`/api/skus/{id}/metrics`)
- Health check endpoint with environment info
- Request logging middleware with latency tracking
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options)

---

## Quick Start

### Option A — GitHub Codespaces

Click **Code → Codespaces → Create codespace** on any branch. The environment automatically:
1. Installs all Python + Node dependencies
2. Seeds the SQLite database from the committed CSVs

Once the Codespace is ready, open the terminal and run:

```bash
make dev
```

This starts both servers. Codespaces will forward port 5173 and open the app in your browser.

### Option B — Docker

```bash
docker compose up --build
```

Opens the full app at **http://localhost:8000** (backend serves the frontend static build).

### Option C — Local development

**Prerequisites:** Python 3.11+, [`uv`](https://github.com/astral-sh/uv), Node.js 22 (`nvm use 22`)

```bash
# Install all dependencies
uv sync
cd frontend && npm ci && cd ..

# Seed the database
uv run python -m scripts.load_data

# Start both servers (with hot reload)
make dev
```

Frontend: **http://localhost:5173** · Backend: **http://localhost:8000**

---

## Running Tests

```bash
# All backend checks (lint, types, unit tests)
make lint
uv run pytest

# All frontend checks (types, lint, unit tests, build)
cd frontend
npx tsc --noEmit
npm run lint
npm run test
npm run build

# End-to-end browser tests (requires backend + frontend running)
npm run test:e2e
```

Or run everything at once:

```bash
make test   # pytest + vitest
make lint   # ruff + mypy + eslint
```

---

## API Reference

| Endpoint | Description |
|----------|-------------|
| `GET /api/skus?search=` | List all SKUs, with optional name filter |
| `GET /api/skus/{id}/historical?weeks=52` | Weekly actuals for a SKU |
| `GET /api/skus/{id}/forecast` | Latest forecast: mean + P05–P95 percentiles |
| `GET /api/skus/{id}/demand-drivers` | Historical + projected price and in-stock rate |
| `GET /api/skus/{id}/previous-year` | Same-week actuals from the prior year |
| `GET /api/skus/{id}/metrics` | Forecast accuracy: MAPE, bias, MAE, RMSE, health |
| `GET /api/aggregate/demand` | Portfolio-level demand (13w history + 39w forecast) |
| `GET /api/alerts` | SKUs with MAPE > 20% needing attention |
| `GET /health` | Health check — `{"status": "ok", "environment": "..."}` |

Interactive docs available at **http://localhost:8000/docs** in development mode.

---

## Database Schema

Data is loaded from two CSVs into SQLite with nested JSON fields normalized into queryable tables.

| Table | Description |
|-------|-------------|
| `items` | Unique SKU registry (`item_id TEXT PK`) |
| `historical_actuals` | Weekly actuals: `item_id`, `timestamp`, `units_sold`, `avg_unit_price`, `cust_instock` |
| `forecast_runs` | Forecast metadata: `item_id`, `inference_date`, `model_id`, `run_id` |
| `forecast_values` | Normalized forecast: `mean` + percentiles `p05`–`p95`, 40 rows per run |
| `projected_demand_drivers` | Future driver projections: `avg_unit_price`, `cust_instock` per week |

Foreign key relationships: `historical_actuals` → `items`, `forecast_runs` → `items`, `forecast_values` → `forecast_runs`, `projected_demand_drivers` → `forecast_runs`.

---

## Environment Variables

All variables use the `STRUM_` prefix and can be set in the shell or a `.env` file.

| Variable | Default | Description |
|----------|---------|-------------|
| `STRUM_DB_PATH` | `data/strumai.db` | SQLite database file path |
| `STRUM_CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed CORS origins (JSON array) |
| `STRUM_ENVIRONMENT` | `development` | `development` or `production` |
| `STRUM_LOG_LEVEL` | `INFO` | Python log level |
| `STRUM_FRONTEND_DIST` | `frontend/dist` | Path to built frontend assets (production) |

---

## Architecture

```
StrumAI/
├── backend/
│   └── app/
│       ├── main.py          # FastAPI app, middleware, static serving
│       ├── config.py        # pydantic-settings env config
│       ├── database.py      # SQLite connection + schema init
│       ├── models.py        # Pydantic response models
│       ├── routes/
│       │   └── skus.py      # All API route handlers
│       └── services/
│           └── demand.py    # Business logic, SQL queries, metrics
├── frontend/
│   ├── src/
│   │   ├── api/             # Typed Axios client + response interfaces
│   │   ├── components/      # KPISummary, AlertCards, charts, SKUHealthCard
│   │   ├── lib/             # recentSKUs localStorage utility
│   │   └── pages/           # HomePage, SKUDetailPage, NotFoundPage
│   └── e2e/                 # Playwright end-to-end tests
├── scripts/
│   └── load_data.py         # CSV → SQLite ingestion script
├── tests/                   # pytest API + service tests
├── data/                    # CSV source files (committed)
├── Dockerfile               # Multi-stage build (frontend + backend)
├── docker-compose.yml       # Production + dev profiles
├── Makefile                 # dev / test / lint / load-data shortcuts
└── .devcontainer/           # GitHub Codespaces configuration
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLite, Pydantic v2, pydantic-settings |
| Frontend | React 19, Vite, TypeScript, Recharts, TailwindCSS, Axios |
| Testing | pytest, Vitest, Playwright |
| Quality | Ruff, Mypy (strict), ESLint, TypeScript strict |
| CI/CD | GitHub Actions (backend + frontend gates on every push) |
| Deployment | Docker multi-stage build, docker-compose, GitHub Codespaces |

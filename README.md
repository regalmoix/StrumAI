# Demand Planning Dashboard

A full-stack demand planning dashboard for retail supply chain teams to monitor weekly sales performance and review AI-generated forecasts at SKU level.

## Tech Stack

- **Backend**: Python 3.11 / FastAPI / SQLite / Pydantic
- **Frontend**: React + Vite + TypeScript / Recharts / TailwindCSS
- **Data Loading**: Python script (`scripts/load_data.py`)

## Setup Instructions

### Prerequisites

- Python 3.11+ with [uv](https://github.com/astral-sh/uv) package manager
- Node.js v22 (use `nvm use 22`)

### 1. Install Python Dependencies

```bash
uv sync
```

### 2. Load Data into SQLite

Place `aggregated_data.csv` and `forecast_data.csv` into the `data/` directory, then run:

```bash
uv run python scripts/load_data.py
```

This creates `data/strumai.db` with normalized tables.

### 3. Start Backend

```bash
uv run uvicorn backend.app.main:app --port 8000 --reload
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 5. Run Quality Checks

```bash
uv run pytest
uv run ruff check .
cd frontend
npm run lint
npm run test
npm run test:e2e
```

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `items` | Unique SKU identifiers (`item_id TEXT PK`) |
| `historical_actuals` | Weekly actuals: `item_id`, `timestamp`, `units_sold`, `avg_unit_price`, `cust_instock` |
| `forecast_runs` | Forecast metadata: `item_id`, `inference_date`, `model_id`, `run_id`, etc. |
| `forecast_values` | Normalized forecasts: `mean` + percentiles `p05`-`p95`, 40 rows per run |
| `projected_demand_drivers` | Future demand drivers: `avg_unit_price`, `cust_instock` per week |

### Relationships

- `historical_actuals.item_id` -> `items.item_id`
- `forecast_runs.item_id` -> `items.item_id`
- `forecast_values.forecast_run_id` -> `forecast_runs.id`
- `projected_demand_drivers.forecast_run_id` -> `forecast_runs.id`

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/skus?search=` | List SKUs with optional search filter |
| `GET /api/skus/{id}/historical?weeks=52` | Historical actuals for a SKU |
| `GET /api/skus/{id}/forecast` | Latest inference forecast (mean + percentiles) |
| `GET /api/skus/{id}/demand-drivers` | Historical + projected demand drivers |
| `GET /api/skus/{id}/previous-year` | Same-week actuals from previous year |
| `GET /api/aggregate/demand` | Aggregated demand: 13w historical + 39w forecast |
| `GET /api/alerts` | SKUs with poor forecast accuracy (MAPE > 20%) |

## Pages

### Page 1: Demand Planning Home (`/`)
- KPI summary cards (total SKUs, last week units, forecast avg, alert count)
- Aggregated demand chart (13w historical + 39w forecast with confidence bands)
- Forecast accuracy alert cards (clickable to SKU detail)
- SKU search bar with autocomplete

### Page 2: SKU Detail Workbench (`/sku/:itemId`)
- 52-week demand chart: historical (13w) + forecast (39w) + previous year overlay
- P10-P90 confidence bands on forecast
- Demand drivers side panel (toggle): avg unit price and in-stock rate charts

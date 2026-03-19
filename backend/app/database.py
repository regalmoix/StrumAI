import sqlite3
from pathlib import Path

import logfire

DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "strumai.db"

logger = logfire.Logfire()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS items (
    item_id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS historical_actuals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    timestamp DATE NOT NULL,
    units_sold INTEGER NOT NULL,
    avg_unit_price REAL,
    cust_instock REAL,
    FOREIGN KEY (item_id) REFERENCES items(item_id),
    UNIQUE(item_id, timestamp)
);

CREATE TABLE IF NOT EXISTS forecast_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    inference_date DATE NOT NULL,
    model_id TEXT,
    run_id TEXT,
    client_id TEXT,
    inference_id TEXT,
    created_at TEXT,
    FOREIGN KEY (item_id) REFERENCES items(item_id),
    UNIQUE(item_id, inference_date)
);

CREATE TABLE IF NOT EXISTS forecast_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_run_id INTEGER NOT NULL,
    timestamp DATE NOT NULL,
    mean REAL NOT NULL,
    p05 REAL, p10 REAL, p15 REAL, p20 REAL, p25 REAL,
    p30 REAL, p35 REAL, p40 REAL, p45 REAL, p50 REAL,
    p55 REAL, p60 REAL, p65 REAL, p70 REAL, p75 REAL,
    p80 REAL, p85 REAL, p90 REAL, p95 REAL,
    FOREIGN KEY (forecast_run_id) REFERENCES forecast_runs(id)
);

CREATE TABLE IF NOT EXISTS projected_demand_drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_run_id INTEGER NOT NULL,
    timestamp DATE NOT NULL,
    avg_unit_price REAL,
    cust_instock REAL,
    FOREIGN KEY (forecast_run_id) REFERENCES forecast_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_historical_item_ts ON historical_actuals(item_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_forecast_values_run ON forecast_values(forecast_run_id);
CREATE INDEX IF NOT EXISTS idx_forecast_runs_item ON forecast_runs(item_id, inference_date);
CREATE INDEX IF NOT EXISTS idx_projected_dd_run ON projected_demand_drivers(forecast_run_id);
"""


def init_db() -> None:
    conn = get_connection()
    try:
        conn.executescript(SCHEMA_SQL)
        conn.commit()
        logger.info("Database schema initialized")
    finally:
        conn.close()

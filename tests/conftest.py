import sqlite3
from collections.abc import Generator
from datetime import date
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from backend.app.database import SCHEMA_SQL

HIST_START = date(2025, 1, 5)
FORECAST_INF_DATES = [date(2025, 3, 23), date(2025, 4, 20)]
FORECAST_START = date(2025, 4, 27)


@pytest.fixture()
def test_db(tmp_path: Path) -> Generator[Path, None, None]:
    db_path = tmp_path / "test.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(SCHEMA_SQL)

    conn.execute("INSERT INTO items (item_id) VALUES (?)", ("SKU_001",))
    conn.execute("INSERT INTO items (item_id) VALUES (?)", ("SKU_002",))

    for week_offset in range(16):
        ts = HIST_START + timedelta(weeks=week_offset)
        for sku, base_units, price in [("SKU_001", 100, 19.99), ("SKU_002", 50, 9.99)]:
            conn.execute(
                "INSERT INTO historical_actuals (item_id, timestamp, units_sold, avg_unit_price, cust_instock) "
                "VALUES (?, ?, ?, ?, ?)",
                (sku, ts.isoformat(), base_units + week_offset * 10, price, 0.95),
            )

    for inf_date in FORECAST_INF_DATES:
        for sku, base_mean in [("SKU_001", 200.0), ("SKU_002", 100.0)]:
            cursor = conn.execute(
                "INSERT INTO forecast_runs (item_id, inference_date, model_id, run_id, client_id) "
                "VALUES (?, ?, ?, ?, ?)",
                (sku, inf_date.isoformat(), "model_1", "run_1", "client_1"),
            )
            run_id = cursor.lastrowid
            for i in range(40):
                fc_ts = FORECAST_START + timedelta(weeks=i)
                mean = base_mean + i * 5
                conn.execute(
                    "INSERT INTO forecast_values "
                    "(forecast_run_id, timestamp, mean, p05, p10, p90, p95) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (run_id, fc_ts.isoformat(), mean, mean * 0.7, mean * 0.8, mean * 1.2, mean * 1.3),
                )
                conn.execute(
                    "INSERT INTO projected_demand_drivers "
                    "(forecast_run_id, timestamp, avg_unit_price, cust_instock) "
                    "VALUES (?, ?, ?, ?)",
                    (run_id, fc_ts.isoformat(), 20.0 + i * 0.1, 0.96),
                )

    conn.commit()
    conn.close()
    yield db_path


def _get_test_connection(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@pytest.fixture()
def client(test_db: Path) -> Generator[TestClient, None, None]:
    with patch("backend.app.services.demand.get_connection", lambda: _get_test_connection(test_db)):
        from backend.app.main import app

        with TestClient(app) as c:
            yield c

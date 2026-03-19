import csv
import json
import sqlite3
from pathlib import Path

import pytest

from backend.app.database import SCHEMA_SQL


@pytest.fixture()
def sample_csvs(tmp_path: Path) -> tuple[Path, Path]:
    agg_path = tmp_path / "aggregated_data.csv"
    with open(agg_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["item_id", "timestamp", "units_sold", "demand_drivers"])
        writer.writeheader()
        for i in range(3):
            writer.writerow(
                {
                    "item_id": "TEST_SKU_001",
                    "timestamp": f"2025-01-{(i + 1) * 7:02d}",
                    "units_sold": str(100 + i * 10),
                    "demand_drivers": json.dumps({"avg_unit_price": 19.99, "cust_instock": 0.95}),
                }
            )

    fc_path = tmp_path / "forecast_data.csv"
    forecasts = []
    drivers = []
    for i in range(3):
        forecasts.append(
            {
                "timestamp": f"2025-02-{(i + 1) * 7:02d}",
                "values": {
                    "mean": 150.0 + i * 5,
                    "p05": 100.0,
                    "p10": 110.0,
                    "p15": 115.0,
                    "p20": 120.0,
                    "p25": 125.0,
                    "p30": 130.0,
                    "p35": 135.0,
                    "p40": 140.0,
                    "p45": 145.0,
                    "p50": 150.0,
                    "p55": 155.0,
                    "p60": 160.0,
                    "p65": 165.0,
                    "p70": 170.0,
                    "p75": 175.0,
                    "p80": 180.0,
                    "p85": 185.0,
                    "p90": 190.0,
                    "p95": 200.0,
                },
            }
        )
        drivers.append(
            {
                "timestamp": f"2025-02-{(i + 1) * 7:02d}",
                "values": {"avg_unit_price": 20.0, "cust_instock": 0.96},
            }
        )

    with open(fc_path, "w", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "client_id",
                "inference_id",
                "model_id",
                "created_at",
                "inference_date",
                "run_id",
                "item_id",
                "forecasts",
                "demand_drivers",
                "auto_features",
            ],
        )
        writer.writeheader()
        writer.writerow(
            {
                "client_id": "TEST",
                "inference_id": "inf_1",
                "model_id": "model_1",
                "created_at": "2025-01-20T00:00:00",
                "inference_date": "2025-01-20",
                "run_id": "run_1",
                "item_id": "TEST_SKU_001",
                "forecasts": json.dumps(forecasts),
                "demand_drivers": json.dumps(drivers),
                "auto_features": "[]",
            }
        )

    return agg_path, fc_path


def test_load_aggregated(sample_csvs: tuple[Path, Path]) -> None:
    agg_path, _ = sample_csvs
    db_path = agg_path.parent / "test.db"
    conn = sqlite3.connect(str(db_path))
    conn.executescript(SCHEMA_SQL)

    import scripts.load_data as loader

    original_csv = loader.AGGREGATED_CSV
    loader.AGGREGATED_CSV = agg_path
    try:
        loader.load_aggregated(conn)
    finally:
        loader.AGGREGATED_CSV = original_csv

    count = conn.execute("SELECT COUNT(*) FROM historical_actuals").fetchone()[0]
    assert count == 3

    row = conn.execute(
        "SELECT * FROM historical_actuals WHERE item_id = 'TEST_SKU_001' ORDER BY timestamp LIMIT 1"
    ).fetchone()
    assert row is not None

    items = conn.execute("SELECT COUNT(*) FROM items").fetchone()[0]
    assert items == 1

    conn.close()


def test_load_forecasts(sample_csvs: tuple[Path, Path]) -> None:
    _, fc_path = sample_csvs
    db_path = fc_path.parent / "test.db"
    conn = sqlite3.connect(str(db_path))
    conn.executescript(SCHEMA_SQL)
    conn.execute("INSERT INTO items (item_id) VALUES (?)", ("TEST_SKU_001",))
    conn.commit()

    import scripts.load_data as loader

    original_csv = loader.FORECAST_CSV
    loader.FORECAST_CSV = fc_path
    try:
        loader.load_forecasts(conn)
    finally:
        loader.FORECAST_CSV = original_csv

    runs = conn.execute("SELECT COUNT(*) FROM forecast_runs").fetchone()[0]
    assert runs == 1

    values = conn.execute("SELECT COUNT(*) FROM forecast_values").fetchone()[0]
    assert values == 3

    drivers = conn.execute("SELECT COUNT(*) FROM projected_demand_drivers").fetchone()[0]
    assert drivers == 3

    conn.close()

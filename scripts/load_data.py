import csv
import json
import sqlite3
from pathlib import Path

import logfire

from backend.app.database import DB_PATH
from backend.app.database import SCHEMA_SQL

logger = logfire.Logfire()

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
AGGREGATED_CSV = DATA_DIR / "aggregated_data.csv"
FORECAST_CSV = DATA_DIR / "forecast_data.csv"


def load_aggregated(conn: sqlite3.Connection) -> None:
    logger.info("Loading aggregated_data.csv")
    items: set[str] = set()
    rows: list[tuple[str, str, int, float | None, float | None]] = []

    with open(AGGREGATED_CSV, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item_id = row["item_id"]
            items.add(item_id)
            drivers = json.loads(row["demand_drivers"])
            rows.append(
                (
                    item_id,
                    row["timestamp"],
                    int(row["units_sold"]),
                    drivers.get("avg_unit_price"),
                    drivers.get("cust_instock"),
                )
            )

    conn.executemany("INSERT OR IGNORE INTO items (item_id) VALUES (?)", [(i,) for i in items])
    conn.executemany(
        "INSERT OR IGNORE INTO historical_actuals (item_id, timestamp, units_sold, avg_unit_price, cust_instock) "
        "VALUES (?, ?, ?, ?, ?)",
        rows,
    )
    conn.commit()
    logger.info("Loaded {count} historical rows for {items} items", count=len(rows), items=len(items))


def load_forecasts(conn: sqlite3.Connection) -> None:
    logger.info("Loading forecast_data.csv")
    run_count = 0
    value_count = 0
    driver_count = 0

    with open(FORECAST_CSV, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item_id = row["item_id"]
            conn.execute("INSERT OR IGNORE INTO items (item_id) VALUES (?)", (item_id,))

            cursor = conn.execute(
                "INSERT OR IGNORE INTO forecast_runs "
                "(item_id, inference_date, model_id, run_id, client_id, inference_id, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    item_id,
                    row["inference_date"],
                    row.get("model_id"),
                    row.get("run_id"),
                    row.get("client_id"),
                    row.get("inference_id"),
                    row.get("created_at"),
                ),
            )

            run_id: int | None
            if cursor.lastrowid and cursor.rowcount > 0:
                run_id = cursor.lastrowid
            else:
                result = conn.execute(
                    "SELECT id FROM forecast_runs WHERE item_id = ? AND inference_date = ?",
                    (item_id, row["inference_date"]),
                ).fetchone()
                run_id = int(result[0]) if result else None

            if run_id is None:
                continue

            run_count += 1

            forecasts = json.loads(row["forecasts"])
            percentile_keys = [
                "p05",
                "p10",
                "p15",
                "p20",
                "p25",
                "p30",
                "p35",
                "p40",
                "p45",
                "p50",
                "p55",
                "p60",
                "p65",
                "p70",
                "p75",
                "p80",
                "p85",
                "p90",
                "p95",
            ]
            for fc in forecasts:
                vals = fc["values"]
                params = [run_id, fc["timestamp"], vals["mean"]]
                params.extend(vals.get(k) for k in percentile_keys)
                conn.execute(
                    "INSERT INTO forecast_values "
                    "(forecast_run_id, timestamp, mean, p05, p10, p15, p20, p25, p30, p35, p40, "
                    "p45, p50, p55, p60, p65, p70, p75, p80, p85, p90, p95) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params,
                )
                value_count += 1

            demand_drivers_raw = row.get("demand_drivers", "[]")
            demand_drivers = json.loads(demand_drivers_raw)
            for dd in demand_drivers:
                vals = dd.get("values", {})
                conn.execute(
                    "INSERT INTO projected_demand_drivers "
                    "(forecast_run_id, timestamp, avg_unit_price, cust_instock) "
                    "VALUES (?, ?, ?, ?)",
                    (run_id, dd["timestamp"], vals.get("avg_unit_price"), vals.get("cust_instock")),
                )
                driver_count += 1

    conn.commit()
    logger.info(
        "Loaded {runs} forecast runs, {values} forecast values, {drivers} projected drivers",
        runs=run_count,
        values=value_count,
        drivers=driver_count,
    )


def main() -> None:
    logfire.configure(send_to_logfire=False)
    logger.info("Starting data load into {path}", path=str(DB_PATH))

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        DB_PATH.unlink()
        logger.info("Removed existing database")

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    try:
        conn.executescript(SCHEMA_SQL)
        logger.info("Schema created")
        load_aggregated(conn)
        load_forecasts(conn)
        logger.info("Data load complete")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

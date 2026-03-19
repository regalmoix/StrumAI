import sqlite3
from datetime import date

from backend.app.database import get_connection

MAX_INFERENCE_DATE_QUERY = "SELECT MAX(inference_date) FROM forecast_runs"


def get_max_inference_date(conn: sqlite3.Connection) -> str:
    row = conn.execute(MAX_INFERENCE_DATE_QUERY).fetchone()
    return row[0] if row else ""


def list_skus(search: str | None = None) -> list[str]:
    conn = get_connection()
    try:
        if search:
            rows = conn.execute(
                "SELECT item_id FROM items WHERE item_id LIKE ? ORDER BY item_id", (f"%{search}%",)
            ).fetchall()
        else:
            rows = conn.execute("SELECT item_id FROM items ORDER BY item_id").fetchall()
        return [r[0] for r in rows]
    finally:
        conn.close()


def get_historical(item_id: str, weeks: int = 52) -> list[dict[str, object]]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT timestamp, units_sold, avg_unit_price, cust_instock "
            "FROM historical_actuals WHERE item_id = ? "
            "ORDER BY timestamp DESC LIMIT ?",
            (item_id, weeks),
        ).fetchall()
        return [dict(r) for r in reversed(rows)]
    finally:
        conn.close()


def get_forecast(item_id: str) -> dict[str, object]:
    conn = get_connection()
    try:
        max_date = get_max_inference_date(conn)
        run = conn.execute(
            "SELECT id, inference_date FROM forecast_runs WHERE item_id = ? AND inference_date = ?",
            (item_id, max_date),
        ).fetchone()
        if not run:
            return {"item_id": item_id, "inference_date": max_date, "forecasts": []}
        rows = conn.execute(
            "SELECT timestamp, mean, p05, p10, p15, p20, p25, p30, p35, p40, "
            "p45, p50, p55, p60, p65, p70, p75, p80, p85, p90, p95 "
            "FROM forecast_values WHERE forecast_run_id = ? ORDER BY timestamp",
            (run["id"],),
        ).fetchall()
        return {
            "item_id": item_id,
            "inference_date": run["inference_date"],
            "forecasts": [dict(r) for r in rows],
        }
    finally:
        conn.close()


def get_demand_drivers(item_id: str) -> dict[str, object]:
    conn = get_connection()
    try:
        historical = conn.execute(
            "SELECT timestamp, avg_unit_price, cust_instock "
            "FROM historical_actuals WHERE item_id = ? ORDER BY timestamp",
            (item_id,),
        ).fetchall()

        max_date = get_max_inference_date(conn)
        run = conn.execute(
            "SELECT id FROM forecast_runs WHERE item_id = ? AND inference_date = ?",
            (item_id, max_date),
        ).fetchone()

        projected: list[dict[str, object]] = []
        if run:
            rows = conn.execute(
                "SELECT timestamp, avg_unit_price, cust_instock "
                "FROM projected_demand_drivers WHERE forecast_run_id = ? ORDER BY timestamp",
                (run["id"],),
            ).fetchall()
            projected = [{**dict(r), "source": "projected"} for r in rows]

        return {
            "item_id": item_id,
            "historical": [{**dict(r), "source": "historical"} for r in historical],
            "projected": projected,
        }
    finally:
        conn.close()


def get_aggregate_demand() -> list[dict[str, object]]:
    conn = get_connection()
    try:
        max_date = get_max_inference_date(conn)

        historical = conn.execute(
            "SELECT timestamp, SUM(units_sold) as value "
            "FROM historical_actuals "
            "WHERE timestamp > date(?, '-91 days') "
            "GROUP BY timestamp ORDER BY timestamp",
            (max_date,),
        ).fetchall()

        forecast_query = """
            SELECT fv.timestamp,
                   SUM(fv.mean) as value,
                   SUM(fv.p10) as p10,
                   SUM(fv.p90) as p90
            FROM forecast_values fv
            JOIN forecast_runs fr ON fv.forecast_run_id = fr.id
            WHERE fr.inference_date = ?
            GROUP BY fv.timestamp
            ORDER BY fv.timestamp
            LIMIT 39
        """
        forecast = conn.execute(forecast_query, (max_date,)).fetchall()

        result: list[dict[str, object]] = []
        for r in historical:
            result.append({"timestamp": r["timestamp"], "value": r["value"], "source": "historical"})
        for r in forecast:
            result.append(
                {
                    "timestamp": r["timestamp"],
                    "value": r["value"],
                    "source": "forecast",
                    "p10": r["p10"],
                    "p90": r["p90"],
                }
            )
        return result
    finally:
        conn.close()


def get_alerts() -> list[dict[str, object]]:
    conn = get_connection()
    try:
        max_date = get_max_inference_date(conn)
        earlier_date = conn.execute(
            "SELECT DISTINCT inference_date FROM forecast_runs "
            "WHERE inference_date <= date(?, '-28 days') ORDER BY inference_date DESC LIMIT 1",
            (max_date,),
        ).fetchone()

        if not earlier_date:
            return []

        ref_date = earlier_date[0]

        query = """
            SELECT fr.item_id,
                   fv.timestamp as fc_ts,
                   fv.mean as fc_mean,
                   ha.units_sold as actual
            FROM forecast_runs fr
            JOIN forecast_values fv ON fv.forecast_run_id = fr.id
            JOIN historical_actuals ha ON ha.item_id = fr.item_id AND ha.timestamp = fv.timestamp
            WHERE fr.inference_date = ?
            ORDER BY fr.item_id, fv.timestamp
        """
        rows = conn.execute(query, (ref_date,)).fetchall()

        from collections import defaultdict

        sku_data: dict[str, list[tuple[float, float]]] = defaultdict(list)
        for r in rows:
            sku_data[r["item_id"]].append((r["fc_mean"], r["actual"]))

        alerts: list[dict[str, object]] = []
        for item_id, pairs in sku_data.items():
            if len(pairs) < 2:
                continue
            total_ape = 0.0
            total_bias = 0.0
            valid = 0
            for fc, actual in pairs:
                if actual > 0:
                    total_ape += abs(fc - actual) / actual
                    total_bias += (fc - actual) / actual
                    valid += 1
            if valid < 2:
                continue
            mape = (total_ape / valid) * 100
            bias = (total_bias / valid) * 100
            direction = "over" if bias > 0 else "under"
            if mape > 20:
                alerts.append(
                    {
                        "item_id": item_id,
                        "mape": round(mape, 1),
                        "bias": round(bias, 1),
                        "direction": direction,
                        "weeks_compared": valid,
                    }
                )

        alerts.sort(key=lambda x: x["mape"], reverse=True)  # type: ignore[arg-type]
        return alerts
    finally:
        conn.close()


def get_previous_year_actuals(item_id: str, timestamps: list[date]) -> list[dict[str, object]]:
    conn = get_connection()
    try:
        result: list[dict[str, object]] = []
        for ts in timestamps:
            prev_year_ts = ts.replace(year=ts.year - 1)
            row = conn.execute(
                "SELECT timestamp, units_sold FROM historical_actuals "
                "WHERE item_id = ? AND timestamp BETWEEN date(?, '-3 days') AND date(?, '+3 days') "
                "ORDER BY ABS(julianday(timestamp) - julianday(?)) LIMIT 1",
                (item_id, str(prev_year_ts), str(prev_year_ts), str(prev_year_ts)),
            ).fetchone()
            if row:
                result.append({"timestamp": str(ts), "units_sold": row["units_sold"]})
        return result
    finally:
        conn.close()

from fastapi.testclient import TestClient


class TestHealthEndpoint:
    def test_health(self, client: TestClient) -> None:
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "environment" in data


class TestSKUsEndpoint:
    def test_list_all_skus(self, client: TestClient) -> None:
        resp = client.get("/api/skus")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        assert "SKU_001" in data["skus"]
        assert "SKU_002" in data["skus"]

    def test_search_skus(self, client: TestClient) -> None:
        resp = client.get("/api/skus", params={"search": "001"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["skus"] == ["SKU_001"]

    def test_search_no_match(self, client: TestClient) -> None:
        resp = client.get("/api/skus", params={"search": "NONEXISTENT"})
        assert resp.status_code == 200
        assert resp.json()["total"] == 0


class TestHistoricalEndpoint:
    def test_get_historical(self, client: TestClient) -> None:
        resp = client.get("/api/skus/SKU_001/historical", params={"weeks": 52})
        assert resp.status_code == 200
        data = resp.json()
        assert data["item_id"] == "SKU_001"
        assert len(data["data"]) > 0
        record = data["data"][0]
        assert "timestamp" in record
        assert "units_sold" in record
        assert "avg_unit_price" in record
        assert "cust_instock" in record

    def test_historical_limited_weeks(self, client: TestClient) -> None:
        resp = client.get("/api/skus/SKU_001/historical", params={"weeks": 5})
        assert resp.status_code == 200
        assert len(resp.json()["data"]) <= 5

    def test_historical_not_found(self, client: TestClient) -> None:
        resp = client.get("/api/skus/NONEXISTENT/historical")
        assert resp.status_code == 404

    def test_historical_sorted_ascending(self, client: TestClient) -> None:
        resp = client.get("/api/skus/SKU_001/historical")
        data = resp.json()["data"]
        timestamps = [r["timestamp"] for r in data]
        assert timestamps == sorted(timestamps)


class TestForecastEndpoint:
    def test_get_forecast(self, client: TestClient) -> None:
        resp = client.get("/api/skus/SKU_001/forecast")
        assert resp.status_code == 200
        data = resp.json()
        assert data["item_id"] == "SKU_001"
        assert data["inference_date"] == "2025-04-20"
        assert len(data["forecasts"]) == 40

    def test_forecast_has_percentiles(self, client: TestClient) -> None:
        resp = client.get("/api/skus/SKU_001/forecast")
        fc = resp.json()["forecasts"][0]
        assert "mean" in fc
        assert "p10" in fc
        assert "p90" in fc
        assert fc["p10"] < fc["mean"] < fc["p90"]

    def test_forecast_nonexistent_sku(self, client: TestClient) -> None:
        resp = client.get("/api/skus/NONEXISTENT/forecast")
        assert resp.status_code == 200
        data = resp.json()
        assert data["forecasts"] == []


class TestDemandDriversEndpoint:
    def test_get_demand_drivers(self, client: TestClient) -> None:
        resp = client.get("/api/skus/SKU_001/demand-drivers")
        assert resp.status_code == 200
        data = resp.json()
        assert data["item_id"] == "SKU_001"
        assert len(data["historical"]) > 0
        assert len(data["projected"]) > 0

    def test_demand_drivers_sources(self, client: TestClient) -> None:
        resp = client.get("/api/skus/SKU_001/demand-drivers")
        data = resp.json()
        for h in data["historical"]:
            assert h["source"] == "historical"
        for p in data["projected"]:
            assert p["source"] == "projected"

    def test_demand_drivers_fields(self, client: TestClient) -> None:
        resp = client.get("/api/skus/SKU_001/demand-drivers")
        data = resp.json()
        record = data["historical"][0]
        assert "avg_unit_price" in record
        assert "cust_instock" in record


class TestAggregateEndpoint:
    def test_aggregate_demand(self, client: TestClient) -> None:
        resp = client.get("/api/aggregate/demand")
        assert resp.status_code == 200
        body = resp.json()
        data = body["data"]
        assert body["inference_date"] == "2025-04-20"
        assert len(data) > 0
        sources = {d["source"] for d in data}
        assert "historical" in sources
        assert "forecast" in sources

    def test_aggregate_has_confidence_bands(self, client: TestClient) -> None:
        resp = client.get("/api/aggregate/demand")
        fc_points = [d for d in resp.json()["data"] if d["source"] == "forecast"]
        assert len(fc_points) > 0
        assert fc_points[0]["p10"] is not None
        assert fc_points[0]["p90"] is not None

    def test_aggregate_uses_exact_window_sizes(self, client: TestClient) -> None:
        resp = client.get("/api/aggregate/demand")
        data = resp.json()["data"]
        hist_points = [d for d in data if d["source"] == "historical"]
        fc_points = [d for d in data if d["source"] == "forecast"]
        assert len(hist_points) == 13
        assert len(fc_points) == 39


class TestAlertsEndpoint:
    def test_alerts_returns_list(self, client: TestClient) -> None:
        resp = client.get("/api/alerts")
        assert resp.status_code == 200
        data = resp.json()
        assert "alerts" in data
        assert isinstance(data["alerts"], list)

    def test_alert_structure(self, client: TestClient) -> None:
        resp = client.get("/api/alerts")
        alerts = resp.json()["alerts"]
        if len(alerts) > 0:
            alert = alerts[0]
            assert "item_id" in alert
            assert "mape" in alert
            assert "bias" in alert
            assert "direction" in alert
            assert alert["direction"] in ("over", "under")
            assert "weeks_compared" in alert

    def test_alerts_sorted_by_mape_desc(self, client: TestClient) -> None:
        resp = client.get("/api/alerts")
        alerts = resp.json()["alerts"]
        mapes = [a["mape"] for a in alerts]
        assert mapes == sorted(mapes, reverse=True)


class TestSKUMetricsEndpoint:
    def test_metrics_returns_valid_response(self, client: TestClient) -> None:
        resp = client.get("/api/skus/SKU_001/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert data["item_id"] == "SKU_001"
        assert data["weeks_compared"] > 0
        assert data["health"] in ("healthy", "watch", "critical")

    def test_metrics_has_all_fields(self, client: TestClient) -> None:
        resp = client.get("/api/skus/SKU_001/metrics")
        data = resp.json()
        for field in ("mape", "bias", "mae", "rmse", "weeks_compared", "health"):
            assert field in data

    def test_metrics_mape_is_positive(self, client: TestClient) -> None:
        resp = client.get("/api/skus/SKU_001/metrics")
        data = resp.json()
        assert data["mape"] >= 0

    def test_metrics_health_classification(self, client: TestClient) -> None:
        resp = client.get("/api/skus/SKU_001/metrics")
        data = resp.json()
        mape = data["mape"]
        if mape <= 20:
            assert data["health"] == "healthy"
        elif mape <= 50:
            assert data["health"] == "watch"
        else:
            assert data["health"] == "critical"

    def test_metrics_nonexistent_sku(self, client: TestClient) -> None:
        resp = client.get("/api/skus/NONEXISTENT/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert data["weeks_compared"] == 0
        assert data["health"] == "unknown"

    def test_metrics_both_skus_have_data(self, client: TestClient) -> None:
        for sku in ("SKU_001", "SKU_002"):
            resp = client.get(f"/api/skus/{sku}/metrics")
            data = resp.json()
            assert data["item_id"] == sku
            assert data["weeks_compared"] > 0


class TestPreviousYearEndpoint:
    def test_previous_year(self, client: TestClient) -> None:
        resp = client.get(
            "/api/skus/SKU_001/previous-year",
            params={"timestamps": "2025-03-01,2025-04-01"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

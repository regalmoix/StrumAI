from datetime import date

from fastapi import APIRouter
from fastapi import HTTPException
from fastapi import Query

from backend.app.models import AggregateResponse
from backend.app.models import AlertsResponse
from backend.app.models import DemandDriversResponse
from backend.app.models import ForecastResponse
from backend.app.models import HistoricalResponse
from backend.app.models import SKUListResponse
from backend.app.services.demand import get_aggregate_demand
from backend.app.services.demand import get_alerts
from backend.app.services.demand import get_demand_drivers
from backend.app.services.demand import get_forecast
from backend.app.services.demand import get_historical
from backend.app.services.demand import get_previous_year_actuals
from backend.app.services.demand import list_skus

router = APIRouter(prefix="/api")


@router.get("/skus", response_model=SKUListResponse)
def api_list_skus(search: str | None = Query(None)) -> SKUListResponse:
    skus = list_skus(search)
    return SKUListResponse(skus=skus, total=len(skus))


@router.get("/skus/{item_id}/historical", response_model=HistoricalResponse)
def api_historical(item_id: str, weeks: int = Query(52, ge=1, le=520)) -> HistoricalResponse:
    data = get_historical(item_id, weeks)
    if not data:
        raise HTTPException(status_code=404, detail=f"No historical data for {item_id}")
    return HistoricalResponse(item_id=item_id, data=data)  # type: ignore[arg-type]


@router.get("/skus/{item_id}/forecast", response_model=ForecastResponse)
def api_forecast(item_id: str) -> ForecastResponse:
    result = get_forecast(item_id)
    return ForecastResponse(**result)  # type: ignore[arg-type]


@router.get("/skus/{item_id}/demand-drivers", response_model=DemandDriversResponse)
def api_demand_drivers(item_id: str) -> DemandDriversResponse:
    result = get_demand_drivers(item_id)
    return DemandDriversResponse(**result)  # type: ignore[arg-type]


@router.get("/skus/{item_id}/previous-year")
def api_previous_year(item_id: str, timestamps: str = Query(...)) -> list[dict[str, object]]:
    ts_list = [date.fromisoformat(t.strip()) for t in timestamps.split(",")]
    return get_previous_year_actuals(item_id, ts_list)


@router.get("/aggregate/demand", response_model=AggregateResponse)
def api_aggregate_demand() -> AggregateResponse:
    data = get_aggregate_demand()
    return AggregateResponse(data=data)  # type: ignore[arg-type]


@router.get("/alerts", response_model=AlertsResponse)
def api_alerts() -> AlertsResponse:
    alerts = get_alerts()
    return AlertsResponse(alerts=alerts)  # type: ignore[arg-type]

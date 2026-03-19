from datetime import date

from pydantic import BaseModel


class SKUItem(BaseModel):
    item_id: str


class HistoricalRecord(BaseModel):
    timestamp: date
    units_sold: int
    avg_unit_price: float | None = None
    cust_instock: float | None = None


class ForecastRecord(BaseModel):
    timestamp: date
    mean: float
    p05: float | None = None
    p10: float | None = None
    p15: float | None = None
    p20: float | None = None
    p25: float | None = None
    p30: float | None = None
    p35: float | None = None
    p40: float | None = None
    p45: float | None = None
    p50: float | None = None
    p55: float | None = None
    p60: float | None = None
    p65: float | None = None
    p70: float | None = None
    p75: float | None = None
    p80: float | None = None
    p85: float | None = None
    p90: float | None = None
    p95: float | None = None


class DemandDriverRecord(BaseModel):
    timestamp: date
    avg_unit_price: float | None = None
    cust_instock: float | None = None
    source: str


class DemandDriversResponse(BaseModel):
    item_id: str
    historical: list[DemandDriverRecord]
    projected: list[DemandDriverRecord]


class ForecastResponse(BaseModel):
    item_id: str
    inference_date: date
    forecasts: list[ForecastRecord]


class HistoricalResponse(BaseModel):
    item_id: str
    data: list[HistoricalRecord]


class AggregatePoint(BaseModel):
    timestamp: date
    value: float
    source: str
    p10: float | None = None
    p90: float | None = None


class AggregateResponse(BaseModel):
    data: list[AggregatePoint]


class AlertItem(BaseModel):
    item_id: str
    mape: float
    bias: float
    direction: str
    weeks_compared: int


class AlertsResponse(BaseModel):
    alerts: list[AlertItem]


class SKUListResponse(BaseModel):
    skus: list[str]
    total: int

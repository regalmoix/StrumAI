export interface HistoricalRecord {
  timestamp: string;
  units_sold: number;
  avg_unit_price: number | null;
  cust_instock: number | null;
}

export interface ForecastRecord {
  timestamp: string;
  mean: number;
  p05: number | null;
  p10: number | null;
  p15: number | null;
  p20: number | null;
  p25: number | null;
  p30: number | null;
  p35: number | null;
  p40: number | null;
  p45: number | null;
  p50: number | null;
  p55: number | null;
  p60: number | null;
  p65: number | null;
  p70: number | null;
  p75: number | null;
  p80: number | null;
  p85: number | null;
  p90: number | null;
  p95: number | null;
}

export interface DemandDriverRecord {
  timestamp: string;
  avg_unit_price: number | null;
  cust_instock: number | null;
  source: 'historical' | 'projected';
}

export interface AggregatePoint {
  timestamp: string;
  value: number;
  source: 'historical' | 'forecast';
  p10: number | null;
  p90: number | null;
}

export interface AlertItem {
  item_id: string;
  mape: number;
  bias: number;
  direction: 'over' | 'under';
  weeks_compared: number;
}

export interface SKUListResponse {
  skus: string[];
  total: number;
}

export interface HistoricalResponse {
  item_id: string;
  data: HistoricalRecord[];
}

export interface ForecastResponse {
  item_id: string;
  inference_date: string;
  forecasts: ForecastRecord[];
}

export interface DemandDriversResponse {
  item_id: string;
  historical: DemandDriverRecord[];
  projected: DemandDriverRecord[];
}

export interface AggregateResponse {
  inference_date: string;
  data: AggregatePoint[];
}

export interface AlertsResponse {
  alerts: AlertItem[];
}

export interface PreviousYearRecord {
  timestamp: string;
  units_sold: number;
}

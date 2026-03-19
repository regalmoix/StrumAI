import axios from 'axios';
import type {
  AggregateResponse,
  AlertsResponse,
  DemandDriversResponse,
  ForecastResponse,
  HistoricalResponse,
  PreviousYearRecord,
  SKUListResponse,
} from './types';

const api = axios.create({ baseURL: '/api' });

export async function fetchSKUs(search?: string): Promise<SKUListResponse> {
  const params = search ? { search } : {};
  const { data } = await api.get<SKUListResponse>('/skus', { params });
  return data;
}

export async function fetchHistorical(itemId: string, weeks = 52): Promise<HistoricalResponse> {
  const { data } = await api.get<HistoricalResponse>(`/skus/${itemId}/historical`, { params: { weeks } });
  return data;
}

export async function fetchForecast(itemId: string): Promise<ForecastResponse> {
  const { data } = await api.get<ForecastResponse>(`/skus/${itemId}/forecast`);
  return data;
}

export async function fetchDemandDrivers(itemId: string): Promise<DemandDriversResponse> {
  const { data } = await api.get<DemandDriversResponse>(`/skus/${itemId}/demand-drivers`);
  return data;
}

export async function fetchAggregateDemand(): Promise<AggregateResponse> {
  const { data } = await api.get<AggregateResponse>('/aggregate/demand');
  return data;
}

export async function fetchAlerts(): Promise<AlertsResponse> {
  const { data } = await api.get<AlertsResponse>('/alerts');
  return data;
}

export async function fetchPreviousYear(
  itemId: string,
  timestamps: string[],
): Promise<PreviousYearRecord[]> {
  const { data } = await api.get<PreviousYearRecord[]>(`/skus/${itemId}/previous-year`, {
    params: { timestamps: timestamps.join(',') },
  });
  return data;
}

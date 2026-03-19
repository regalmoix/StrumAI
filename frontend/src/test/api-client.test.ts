import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  fetchSKUs,
  fetchHistorical,
  fetchForecast,
  fetchDemandDrivers,
  fetchAggregateDemand,
  fetchAlerts,
  fetchPreviousYear,
} from '../api/client';

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
  };
  return { default: mockAxios };
});

const mockedAxios = axios.create() as unknown as { get: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchSKUs', () => {
  it('calls /skus without search param', async () => {
    mockedAxios.get.mockResolvedValue({ data: { skus: ['A', 'B'], total: 2 } });
    const result = await fetchSKUs();
    expect(mockedAxios.get).toHaveBeenCalledWith('/skus', { params: {} });
    expect(result.total).toBe(2);
  });

  it('calls /skus with search param', async () => {
    mockedAxios.get.mockResolvedValue({ data: { skus: ['A'], total: 1 } });
    const result = await fetchSKUs('test');
    expect(mockedAxios.get).toHaveBeenCalledWith('/skus', { params: { search: 'test' } });
    expect(result.skus).toEqual(['A']);
  });
});

describe('fetchHistorical', () => {
  it('calls correct endpoint with weeks', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { item_id: 'X', data: [{ timestamp: '2025-01-01', units_sold: 100 }] },
    });
    const result = await fetchHistorical('X', 13);
    expect(mockedAxios.get).toHaveBeenCalledWith('/skus/X/historical', { params: { weeks: 13 } });
    expect(result.item_id).toBe('X');
  });
});

describe('fetchForecast', () => {
  it('calls correct endpoint', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { item_id: 'X', inference_date: '2025-04-20', forecasts: [] },
    });
    const result = await fetchForecast('X');
    expect(mockedAxios.get).toHaveBeenCalledWith('/skus/X/forecast');
    expect(result.inference_date).toBe('2025-04-20');
  });
});

describe('fetchDemandDrivers', () => {
  it('calls correct endpoint', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { item_id: 'X', historical: [], projected: [] },
    });
    const result = await fetchDemandDrivers('X');
    expect(mockedAxios.get).toHaveBeenCalledWith('/skus/X/demand-drivers');
    expect(result.item_id).toBe('X');
  });
});

describe('fetchAggregateDemand', () => {
  it('calls correct endpoint', async () => {
    mockedAxios.get.mockResolvedValue({ data: { inference_date: '2025-04-20', data: [] } });
    const result = await fetchAggregateDemand();
    expect(mockedAxios.get).toHaveBeenCalledWith('/aggregate/demand');
    expect(result.inference_date).toBe('2025-04-20');
    expect(result.data).toEqual([]);
  });
});

describe('fetchAlerts', () => {
  it('calls correct endpoint', async () => {
    mockedAxios.get.mockResolvedValue({ data: { alerts: [] } });
    const result = await fetchAlerts();
    expect(mockedAxios.get).toHaveBeenCalledWith('/alerts');
    expect(result.alerts).toEqual([]);
  });
});

describe('fetchPreviousYear', () => {
  it('passes timestamps as comma-separated string', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });
    await fetchPreviousYear('X', ['2025-01-01', '2025-01-08']);
    expect(mockedAxios.get).toHaveBeenCalledWith('/skus/X/previous-year', {
      params: { timestamps: '2025-01-01,2025-01-08' },
    });
  });
});

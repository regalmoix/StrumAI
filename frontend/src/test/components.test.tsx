import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/client', () => ({
  fetchSKUs: vi.fn(),
  fetchAggregateDemand: vi.fn(),
  fetchAlerts: vi.fn(),
}));

import { fetchSKUs, fetchAggregateDemand, fetchAlerts } from '../api/client';
import SKUSearch from '../components/SKUSearch';
import AlertCards from '../components/AlertCards';
import KPISummary from '../components/KPISummary';

const mockedFetchSKUs = vi.mocked(fetchSKUs);
const mockedFetchAlerts = vi.mocked(fetchAlerts);
const mockedFetchAggregateDemand = vi.mocked(fetchAggregateDemand);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SKUSearch', () => {
  it('renders search input', () => {
    render(
      <MemoryRouter>
        <SKUSearch />
      </MemoryRouter>,
    );
    expect(screen.getByPlaceholderText('Search SKU...')).toBeInTheDocument();
  });

  it('shows results when typing', async () => {
    mockedFetchSKUs.mockResolvedValue({ skus: ['SKU_001', 'SKU_002'], total: 2 });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SKUSearch />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText('Search SKU...'), 'SKU');

    await waitFor(() => {
      expect(screen.getByText('SKU_001')).toBeInTheDocument();
      expect(screen.getByText('SKU_002')).toBeInTheDocument();
    });
  });

  it('does not search with less than 2 characters', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SKUSearch />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText('Search SKU...'), 'S');
    expect(mockedFetchSKUs).not.toHaveBeenCalled();
  });
});

describe('AlertCards', () => {
  it('shows empty state when no alerts', async () => {
    mockedFetchAlerts.mockResolvedValue({ alerts: [] });

    render(
      <MemoryRouter>
        <AlertCards />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('No forecast accuracy alerts at this time.')).toBeInTheDocument();
    });
  });

  it('renders alert cards', async () => {
    mockedFetchAlerts.mockResolvedValue({
      alerts: [
        { item_id: 'CUST_003_ITEM_001', mape: 45.2, bias: 30.1, direction: 'over' as const, weeks_compared: 4 },
        { item_id: 'CUST_003_ITEM_002', mape: 32.8, bias: -20.5, direction: 'under' as const, weeks_compared: 3 },
      ],
    });

    render(
      <MemoryRouter>
        <AlertCards />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('ITEM_001')).toBeInTheDocument();
      expect(screen.getByText('ITEM_002')).toBeInTheDocument();
      expect(screen.getByText('Over')).toBeInTheDocument();
      expect(screen.getByText('Under')).toBeInTheDocument();
    });
  });

  it('caps MAPE display at 999+', async () => {
    mockedFetchAlerts.mockResolvedValue({
      alerts: [
        { item_id: 'SKU_BIG', mape: 5000, bias: 5000, direction: 'over' as const, weeks_compared: 2 },
      ],
    });

    render(
      <MemoryRouter>
        <AlertCards />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('999+%')).toBeInTheDocument();
    });
  });
});

describe('KPISummary', () => {
  it('renders KPI cards with data', async () => {
    mockedFetchAggregateDemand.mockResolvedValue({
      inference_date: '2025-04-20',
      data: [
        { timestamp: '2025-04-13', value: 75000, source: 'historical' as const, p10: null, p90: null },
        { timestamp: '2025-04-20', value: 80000, source: 'historical' as const, p10: null, p90: null },
        { timestamp: '2025-04-27', value: 85000, source: 'forecast' as const, p10: 70000, p90: 100000 },
      ],
    });
    mockedFetchSKUs.mockResolvedValue({ skus: [], total: 166 });
    mockedFetchAlerts.mockResolvedValue({ alerts: [{ item_id: 'X', mape: 30, bias: 10, direction: 'over' as const, weeks_compared: 2 }] });

    render(
      <MemoryRouter>
        <KPISummary />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('166')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../api/client', () => ({
  fetchSKUs: vi.fn().mockResolvedValue({ skus: [], total: 0 }),
  fetchAggregateDemand: vi.fn().mockResolvedValue({ inference_date: '2025-04-20', data: [] }),
  fetchAlerts: vi.fn().mockResolvedValue({ alerts: [] }),
  fetchHistorical: vi.fn().mockResolvedValue({ item_id: 'TEST', data: [] }),
  fetchForecast: vi.fn().mockResolvedValue({ item_id: 'TEST', inference_date: '2025-04-20', forecasts: [] }),
  fetchPreviousYear: vi.fn().mockResolvedValue([]),
  fetchDemandDrivers: vi.fn().mockResolvedValue({ item_id: 'TEST', historical: [], projected: [] }),
  fetchSKUMetrics: vi.fn().mockResolvedValue({
    item_id: 'TEST', mape: null, bias: null, mae: null, rmse: null, weeks_compared: 0, health: 'unknown',
  }),
}));

import HomePage from '../pages/HomePage';
import SKUDetailPage from '../pages/SKUDetailPage';

describe('HomePage', () => {
  it('renders header with title', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Demand Planning')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByPlaceholderText('Search SKU...')).toBeInTheDocument();
  });

  it('renders footer with inference date', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('home-inference-date')).toHaveTextContent('Data as of 2025-04-20');
    });
  });
});

describe('SKUDetailPage', () => {
  it('renders with SKU from route params', () => {
    render(
      <MemoryRouter initialEntries={['/sku/CUST_003_ITEM_0243']}>
        <Routes>
          <Route path="/sku/:itemId" element={<SKUDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Demand Forecast')).toBeInTheDocument();
  });

  it('renders breadcrumb with Home link', () => {
    render(
      <MemoryRouter initialEntries={['/sku/CUST_003_ITEM_0243']}>
        <Routes>
          <Route path="/sku/:itemId" element={<SKUDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders drivers toggle button', () => {
    render(
      <MemoryRouter initialEntries={['/sku/TEST_SKU']}>
        <Routes>
          <Route path="/sku/:itemId" element={<SKUDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTitle('Open demand drivers')).toBeInTheDocument();
  });
});

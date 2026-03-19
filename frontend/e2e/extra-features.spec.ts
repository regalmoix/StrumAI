import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

import type { SKUListResponse, SKUMetricsResponse } from "../src/api/types";

async function getJson<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(path);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

test("home page shows portfolio health KPI card", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("kpi-summary")).toBeVisible();
  await expect(page.getByText("Portfolio Health")).toBeVisible();
});

test("home page shows week-over-week trend indicator on Last Week Units", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("kpi-summary")).toBeVisible();
  await expect(page.getByTestId("kpi-trend")).toBeVisible();
});

test("SKU detail page shows forecast health card with metrics", async ({ page, request }) => {
  const skus = await getJson<SKUListResponse>(request, "/api/skus");
  const sku = skus.skus[0];
  const metrics = await getJson<SKUMetricsResponse>(request, `/api/skus/${sku}/metrics`);

  await page.goto(`/sku/${sku}`);
  await expect(page.getByTestId("sku-health-card")).toBeVisible();

  if (metrics.weeks_compared > 0) {
    await expect(page.getByText("Forecast Health")).toBeVisible();
    const healthLabel = metrics.health === "healthy" ? "Healthy"
      : metrics.health === "watch" ? "Watch" : "Critical";
    await expect(page.getByText(healthLabel)).toBeVisible();
  } else {
    await expect(page.getByText("Forecast accuracy metrics not available")).toBeVisible();
  }
});

test("SKU metrics API returns valid response for each SKU", async ({ request }) => {
  const skus = await getJson<SKUListResponse>(request, "/api/skus");

  for (const sku of skus.skus) {
    const metrics = await getJson<SKUMetricsResponse>(request, `/api/skus/${sku}/metrics`);
    expect(metrics.item_id).toBe(sku);
    expect(metrics.weeks_compared).toBeGreaterThanOrEqual(0);
    expect(["healthy", "watch", "critical", "unknown"]).toContain(metrics.health);
  }
});

test("recently viewed SKUs appear on home page after visiting a SKU detail", async ({ page, request }) => {
  const skus = await getJson<SKUListResponse>(request, "/api/skus");
  const sku = skus.skus[0];

  await page.goto(`/sku/${sku}`);
  await expect(page.getByTestId("sku-demand-chart")).toBeVisible();

  await page.goto("/");

  await expect(page.getByTestId("recently-viewed-skus")).toBeVisible();
  await expect(page.getByTestId(`recent-sku-${sku}`)).toBeVisible();
});

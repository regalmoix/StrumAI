import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

import type {
  AggregateResponse,
  AlertsResponse,
  ForecastResponse,
  SKUListResponse,
} from "../src/api/types";

async function getJson<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(path);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

test("home page renders aggregate demand and latest inference date", async ({ page, request }) => {
  const aggregate = await getJson<AggregateResponse>(request, "/api/aggregate/demand");
  const alerts = await getJson<AlertsResponse>(request, "/api/alerts");
  const historical = aggregate.data.filter((point) => point.source === "historical");
  const forecast = aggregate.data.filter((point) => point.source === "forecast");

  expect(historical).toHaveLength(13);
  expect(forecast).toHaveLength(39);

  await page.goto("/");

  await expect(page.getByText("Demand Planning", { exact: true })).toBeVisible();
  await expect(page.getByTestId("sku-search-input")).toBeVisible();
  await expect(page.getByTestId("aggregate-demand-chart")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aggregated Demand" })).toBeVisible();
  await expect(page.getByText("Last 13 weeks historical + 39 week forecast")).toBeVisible();
  await expect(page.getByTestId("home-inference-date")).toContainText(`Data as of ${aggregate.inference_date}`);

  if (alerts.alerts.length > 0) {
    await expect(page.getByTestId(`alert-card-${alerts.alerts[0].item_id}`)).toBeVisible();
  } else {
    await expect(page.getByText("No forecast accuracy alerts at this time.")).toBeVisible();
  }
});

test("search navigates to the SKU detail workbench", async ({ page, request }) => {
  const searchResults = await getJson<SKUListResponse>(request, "/api/skus?search=ITEM_0");
  const sku = searchResults.skus[0];

  expect(sku).toBeTruthy();

  const forecast = await getJson<ForecastResponse>(request, `/api/skus/${sku}/forecast`);

  await page.goto("/");
  await page.getByTestId("sku-search-input").fill(sku);
  await expect(page.getByTestId(`sku-search-result-${sku}`)).toBeVisible();
  await page.getByTestId(`sku-search-result-${sku}`).click();

  await expect(page).toHaveURL(`http://127.0.0.1:5173/sku/${sku}`);
  await expect(page.getByRole("heading", { name: "Demand Forecast" })).toBeVisible();
  await expect(page.getByText("52-week view: 13w historical + 39w forecast")).toBeVisible();
  await expect(page.getByText(`Inference ${forecast.inference_date}`)).toBeVisible();
  await expect(page.getByTestId("sku-demand-chart")).toBeVisible();
});

test("alert cards navigate to the SKU detail workbench", async ({ page, request }) => {
  const alerts = await getJson<AlertsResponse>(request, "/api/alerts");

  test.skip(alerts.alerts.length === 0, "The seeded dataset did not produce any alert cards.");

  const alert = alerts.alerts[0];

  await page.goto("/");
  await page.getByTestId(`alert-card-${alert.item_id}`).click();

  await expect(page).toHaveURL(`http://127.0.0.1:5173/sku/${alert.item_id}`);
  await expect(page.getByText(alert.item_id)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Demand Forecast" })).toBeVisible();
});

test("demand drivers panel opens for a SKU and shows both charts", async ({ page, request }) => {
  const searchResults = await getJson<SKUListResponse>(request, "/api/skus?search=ITEM_0");
  const sku = searchResults.skus[0];

  expect(sku).toBeTruthy();

  await page.goto(`/sku/${sku}`);

  await expect(page.getByRole("heading", { name: "Demand Forecast" })).toBeVisible();
  await page.getByTestId("demand-drivers-toggle").click();

  await expect(page.getByTestId("demand-drivers-panel")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Avg Unit Price" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "In-Stock Rate" })).toBeVisible();
  await expect(page.getByTitle("Close demand drivers")).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("home page renders and supports favorites", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Traffic cameras and active road events")).toBeVisible();
  await expect(page.getByText("Camera list")).toBeVisible();

  const firstSave = page.getByRole("button", { name: /toggle favorite/i }).first();
  await firstSave.click();
  await page.reload();

  await expect(page.getByText("1 favorites saved locally")).toBeVisible();
});

test("provider outage banner displays under mocked outage", async ({ page }) => {
  await page.route("**/api/bootstrap", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        cameras: [],
        events: [],
        generatedAt: new Date().toISOString(),
        staleWarnings: ["drivebc-events data may be stale or partially unavailable."],
        health: [
          {
            provider: "drivebc-events",
            status: "degraded",
            message: "Mock outage",
            checkedAt: new Date().toISOString(),
            stale: true
          }
        ],
        config: {
          defaultCenter: { lat: 49.2827, lng: -123.1207, zoom: 11 },
          regions: [],
          ui: { showProviderHealth: true }
        }
      })
    });
  });

  await page.goto("/");
  await expect(page.getByText(/partially unavailable/i)).toBeVisible();
});

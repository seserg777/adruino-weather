import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("shows title and 8-day forecast table", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Weather in Przemyśl" }),
    ).toBeVisible();

    await expect(
      page.getByRole("region", {
        name: "Temperature for the next twenty-four hours in three-hour steps",
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Next 24 hours" })).toBeVisible();

    const forecast = page.getByRole("region", { name: "8-day forecast" });
    await expect(forecast).toBeVisible();
    await expect(forecast.getByRole("heading", { name: "Forecast" })).toBeVisible();

    await expect(forecast.locator("tbody tr")).toHaveCount(8);
    await expect(page.getByRole("cell", { name: "2030-01-01", exact: true })).toBeVisible();
  });
});

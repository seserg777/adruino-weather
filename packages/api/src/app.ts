import { Hono } from "hono";
import {
  type FetchFn,
  fetchWeatherForecastForPrzemysl,
  toDeviceForecast,
} from "@repo/weather-core";

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=60";

export function createApiApp(fetchImpl?: FetchFn) {
  const app = new Hono().basePath("/api");

  app.get("/", async (c) => {
    try {
      const data = await fetchWeatherForecastForPrzemysl(fetchImpl);
      return c.json(data, 200, {
        "Cache-Control": CACHE_CONTROL,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upstream error";
      return c.json({ error: message }, 502);
    }
  });

  app.get("/device", async (c) => {
    try {
      const data = await fetchWeatherForecastForPrzemysl(fetchImpl);
      const device = toDeviceForecast(data);
      return c.json(device, 200, {
        "Cache-Control": CACHE_CONTROL,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upstream error";
      return c.json({ error: message }, 502);
    }
  });

  app.notFound((c) => c.json({ error: "Not Found" }, 404));

  return app;
}

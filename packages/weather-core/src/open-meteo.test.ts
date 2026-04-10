import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fetchWeatherForecastForPrzemysl } from "./open-meteo.js";

describe("fetchWeatherForecastForPrzemysl", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("maps Open-Meteo daily payload to the public contract", async () => {
    const payload = {
      daily: {
        time: [
          "2026-04-10",
          "2026-04-11",
          "2026-04-12",
          "2026-04-13",
          "2026-04-14",
          "2026-04-15",
          "2026-04-16",
          "2026-04-17",
        ],
        weather_code: [0, 1, 2, 3, 45, 48, 51, 61],
        temperature_2m_max: [10, 11, 12, 13, 14, 15, 16, 17],
        temperature_2m_min: [0, 1, 2, 3, 4, 5, 6, 7],
        precipitation_sum: [0, 0.2, null, 1, 0, 0, 0, 2],
      },
    };

    global.fetch = jest.fn(async () => {
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const data = await fetchWeatherForecastForPrzemysl();

    expect(data.days).toHaveLength(8);
    expect(data.days[2]?.precipitationSumMm).toBe(0);
    expect(data.meta.forecastDays).toBe(8);
    expect(data.meta.source).toBe("open-meteo");
  });

  it("throws on non-OK upstream response", async () => {
    global.fetch = jest.fn(async () => new Response("", { status: 503 })) as unknown as typeof fetch;

    await expect(fetchWeatherForecastForPrzemysl()).rejects.toThrow("503");
  });
});

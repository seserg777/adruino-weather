import { describe, expect, it } from "@jest/globals";
import { toDeviceForecast } from "./device.js";
import type { WeatherForecastResponse } from "./schema.js";

describe("toDeviceForecast", () => {
  it("maps full response to compact device payload", () => {
    const input: WeatherForecastResponse = {
      location: {
        name: "Przemyśl",
        region: "Subcarpathian Voivodeship",
        country: "Poland",
        latitude: 49.8,
        longitude: 22.77,
      },
      now: {
        time: "2026-04-19T15:30:00.000+02:00",
        temperatureC: 17.4,
        weatherCode: 3,
      },
      shortTerm: Array.from({ length: 9 }, (_, i) => ({
        offsetHours: i * 3,
        time: "2026-04-19T15:30:00.000+02:00",
        temperatureC: 10 + i,
        weatherCode: i % 2,
      })),
      days: Array.from({ length: 8 }, (_, i) => ({
        date: `2026-04-${10 + i}`,
        weatherCode: 0,
        temperatureMaxC: 10,
        temperatureMinC: 0,
        precipitationSumMm: 0,
      })),
      meta: {
        forecastDays: 8,
        shortTermStepHours: 3,
        shortTermHorizonHours: 24,
        timezone: "Europe/Warsaw",
        source: "open-meteo",
        fetchedAt: "2026-04-19T15:30:00.000+02:00",
      },
    };

    const d = toDeviceForecast(input);
    expect(d.v).toBe(1);
    expect(d.t).toBe(17);
    expect(d.w).toBe(3);
    expect(d.st).toHaveLength(9);
    expect(d.st[0]).toEqual({ h: 0, t: 10, w: 0 });
    expect(d.st[1]).toEqual({ h: 3, t: 11, w: 1 });
  });
});

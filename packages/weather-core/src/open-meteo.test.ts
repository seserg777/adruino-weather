import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  fetchWeatherForecastForPrzemysl,
  hourlyTimeToUtcMs,
} from "./open-meteo.js";

function buildHourlyPayloadUtc(
  startIso: string,
  hourCount: number,
): {
  utc_offset_seconds: number;
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
} {
  const start = Date.parse(startIso);
  const time: string[] = [];
  const temperature_2m: number[] = [];
  const weather_code: number[] = [];
  for (let i = 0; i < hourCount; i++) {
    time.push(new Date(start + i * 3600000).toISOString());
    temperature_2m.push(10 + i * 0.25);
    weather_code.push(i % 80);
  }
  return {
    utc_offset_seconds: 0,
    hourly: { time, temperature_2m, weather_code },
  };
}

describe("hourlyTimeToUtcMs", () => {
  it("parses ISO strings with Z as UTC", () => {
    const ms = hourlyTimeToUtcMs("2026-04-10T12:00:00.000Z", 0);
    expect(ms).toBe(Date.parse("2026-04-10T12:00:00.000Z"));
  });

  it("appends utc_offset_seconds for offset-less local strings", () => {
    const ms = hourlyTimeToUtcMs("2026-04-10T12:00", 7200);
    expect(ms).toBe(Date.parse("2026-04-10T12:00+02:00"));
  });
});

describe("fetchWeatherForecastForPrzemysl", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("maps Open-Meteo payload to the public contract with short-term series", async () => {
    const daily = {
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
    };
    const hourlyBlock = buildHourlyPayloadUtc("2026-04-10T00:00:00.000Z", 72);
    const payload = {
      utc_offset_seconds: hourlyBlock.utc_offset_seconds,
      daily,
      hourly: hourlyBlock.hourly,
    };

    global.fetch = jest.fn(async () => {
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const ref = new Date("2026-04-10T12:30:00.000Z");
    const data = await fetchWeatherForecastForPrzemysl(undefined, {
      referenceTime: ref,
    });

    expect(data.days).toHaveLength(8);
    expect(data.days[2]?.precipitationSumMm).toBe(0);
    expect(data.meta.forecastDays).toBe(8);
    expect(data.meta.shortTermStepHours).toBe(3);
    expect(data.meta.shortTermHorizonHours).toBe(24);
    expect(data.meta.source).toBe("open-meteo");

    expect(data.shortTerm).toHaveLength(9);
    expect(data.shortTerm[0]?.offsetHours).toBe(0);
    expect(data.shortTerm[8]?.offsetHours).toBe(24);

    const y12 = 10 + 12 * 0.25;
    const y13 = 10 + 13 * 0.25;
    const expectedNow = y12 + 0.5 * (y13 - y12);
    expect(data.now.temperatureC).toBeCloseTo(expectedNow, 10);
    expect(data.shortTerm[0]?.temperatureC).toBeCloseTo(expectedNow, 10);
  });

  it("throws on non-OK upstream response", async () => {
    global.fetch = jest.fn(async () => new Response("", { status: 503 })) as unknown as typeof fetch;

    await expect(fetchWeatherForecastForPrzemysl()).rejects.toThrow("503");
  });
});

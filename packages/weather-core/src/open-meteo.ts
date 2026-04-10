import { z } from "zod";
import { FORECAST_DAYS, PRZEMYSL, WEATHER_TIMEZONE } from "./location.js";
import {
  type WeatherForecastResponse,
  weatherForecastResponseSchema,
} from "./schema.js";

const openMeteoDailySchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number().int()),
    temperature_2m_max: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
    precipitation_sum: z.array(z.number().nullable()),
  }),
});

const openMeteoHourlyBlockSchema = z.object({
  utc_offset_seconds: z.number().int(),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(z.number()),
    weather_code: z.array(z.number().int()),
  }),
});

const openMeteoForecastPayloadSchema = openMeteoDailySchema.merge(
  openMeteoHourlyBlockSchema,
);

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const SHORT_TERM_OFFSET_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24] as const;
const HOURLY_FORECAST_HOURS = 72;

export type FetchFn = typeof fetch;

export type FetchWeatherOptions = {
  /** Fixed instant for tests (interpolation and `fetchedAt`). */
  referenceTime?: Date;
};

/** Open-Meteo local wall times without offset, or any ISO string parseable by Date. */
export function hourlyTimeToUtcMs(
  timeStr: string,
  utcOffsetSeconds: number,
): number {
  const trimmed = timeStr.trim();
  if (/[zZ]$/.test(trimmed)) {
    return Date.parse(trimmed);
  }
  const sign = utcOffsetSeconds >= 0 ? "+" : "-";
  const abs = Math.abs(utcOffsetSeconds);
  const hh = String(Math.floor(abs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
  return Date.parse(`${trimmed}${sign}${hh}:${mm}`);
}

function interpolateTemperature(
  hourMs: number[],
  temps: number[],
  targetMs: number,
): number {
  const n = hourMs.length;
  if (n < 2) {
    throw new Error("Open-Meteo hourly arrays too short for interpolation");
  }
  if (targetMs < hourMs[0]! || targetMs > hourMs[n - 1]!) {
    throw new Error("Target time outside hourly forecast range");
  }
  for (let i = 0; i < n - 1; i++) {
    const t0 = hourMs[i]!;
    const t1 = hourMs[i + 1]!;
    if (targetMs >= t0 && targetMs <= t1) {
      const y0 = temps[i]!;
      const y1 = temps[i + 1]!;
      if (t1 === t0) return y0;
      return y0 + ((targetMs - t0) / (t1 - t0)) * (y1 - y0);
    }
  }
  return temps[n - 1]!;
}

function nearestWeatherCode(
  targetMs: number,
  hourMs: number[],
  codes: number[],
): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < hourMs.length; i++) {
    const d = Math.abs(hourMs[i]! - targetMs);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return codes[bestIdx]!;
}

export async function fetchWeatherForecastForPrzemysl(
  fetchImpl: FetchFn = fetch,
  options?: FetchWeatherOptions,
): Promise<WeatherForecastResponse> {
  const clock = options?.referenceTime ?? new Date();
  const fetchedAt = clock.toISOString();
  const refMs = clock.getTime();

  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set("latitude", String(PRZEMYSL.latitude));
  url.searchParams.set("longitude", String(PRZEMYSL.longitude));
  url.searchParams.set("timezone", WEATHER_TIMEZONE);
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));
  url.searchParams.set("forecast_hours", String(HOURLY_FORECAST_HOURS));
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
    ].join(","),
  );
  url.searchParams.set("hourly", "temperature_2m,weather_code");

  const res = await fetchImpl(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Open-Meteo HTTP ${res.status}`);
  }

  const json: unknown = await res.json();
  const parsed = openMeteoForecastPayloadSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Open-Meteo response shape mismatch");
  }

  const { daily, hourly, utc_offset_seconds } = parsed.data;
  const nDay = daily.time.length;
  if (
    nDay !== FORECAST_DAYS ||
    daily.weather_code.length !== nDay ||
    daily.temperature_2m_max.length !== nDay ||
    daily.temperature_2m_min.length !== nDay ||
    daily.precipitation_sum.length !== nDay
  ) {
    throw new Error("Open-Meteo daily arrays length mismatch");
  }

  const nh = hourly.time.length;
  if (
    nh < 2 ||
    hourly.temperature_2m.length !== nh ||
    hourly.weather_code.length !== nh
  ) {
    throw new Error("Open-Meteo hourly arrays length mismatch");
  }

  const hourMs = hourly.time.map((t) =>
    hourlyTimeToUtcMs(t, utc_offset_seconds),
  );
  const temps = hourly.temperature_2m;
  const codes = hourly.weather_code;

  const horizonEnd = refMs + 24 * 60 * 60 * 1000;
  if (hourMs[0]! > refMs || hourMs[hourMs.length - 1]! < horizonEnd) {
    throw new Error("Open-Meteo hourly range does not cover short-term horizon");
  }

  const shortTerm = SHORT_TERM_OFFSET_HOURS.map((offsetHours) => {
    const targetMs = refMs + offsetHours * 60 * 60 * 1000;
    const temperatureC = interpolateTemperature(hourMs, temps, targetMs);
    const weatherCode = nearestWeatherCode(targetMs, hourMs, codes);
    return {
      offsetHours,
      time: new Date(targetMs).toISOString(),
      temperatureC,
      weatherCode,
    };
  });

  const first = shortTerm[0]!;
  const now = {
    time: first.time,
    temperatureC: first.temperatureC,
    weatherCode: first.weatherCode,
  };

  const days = daily.time.map((date, i) => ({
    date,
    weatherCode: daily.weather_code[i]!,
    temperatureMaxC: daily.temperature_2m_max[i]!,
    temperatureMinC: daily.temperature_2m_min[i]!,
    precipitationSumMm: daily.precipitation_sum[i] ?? 0,
  }));

  const body: WeatherForecastResponse = {
    location: {
      name: PRZEMYSL.name,
      region: PRZEMYSL.region,
      country: PRZEMYSL.country,
      latitude: PRZEMYSL.latitude,
      longitude: PRZEMYSL.longitude,
    },
    now,
    shortTerm,
    days,
    meta: {
      forecastDays: 8,
      shortTermStepHours: 3,
      shortTermHorizonHours: 24,
      timezone: WEATHER_TIMEZONE,
      source: "open-meteo",
      fetchedAt,
    },
  };

  return weatherForecastResponseSchema.parse(body);
}

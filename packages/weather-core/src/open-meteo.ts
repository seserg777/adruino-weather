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

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export type FetchFn = typeof fetch;

export async function fetchWeatherForecastForPrzemysl(
  fetchImpl: FetchFn = fetch,
): Promise<WeatherForecastResponse> {
  const fetchedAt = new Date().toISOString();
  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set("latitude", String(PRZEMYSL.latitude));
  url.searchParams.set("longitude", String(PRZEMYSL.longitude));
  url.searchParams.set("timezone", WEATHER_TIMEZONE);
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
    ].join(","),
  );

  const res = await fetchImpl(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Open-Meteo HTTP ${res.status}`);
  }

  const json: unknown = await res.json();
  const parsed = openMeteoDailySchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Open-Meteo response shape mismatch");
  }

  const { daily } = parsed.data;
  const n = daily.time.length;
  if (
    n !== FORECAST_DAYS ||
    daily.weather_code.length !== n ||
    daily.temperature_2m_max.length !== n ||
    daily.temperature_2m_min.length !== n ||
    daily.precipitation_sum.length !== n
  ) {
    throw new Error("Open-Meteo daily arrays length mismatch");
  }

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
    days,
    meta: {
      forecastDays: 8,
      timezone: WEATHER_TIMEZONE,
      source: "open-meteo",
      fetchedAt,
    },
  };

  return weatherForecastResponseSchema.parse(body);
}

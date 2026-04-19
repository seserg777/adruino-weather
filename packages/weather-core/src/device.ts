import { z } from "zod";
import type { WeatherForecastResponse } from "./schema.js";

export const deviceShortPointSchema = z.object({
  h: z.number().int().min(0).max(24),
  t: z.number().int(),
  w: z.number().int(),
});

export const deviceForecastSchema = z.object({
  v: z.literal(1),
  lh: z.number().int().min(0).max(23),
  lm: z.number().int().min(0).max(59),
  t: z.number().int(),
  w: z.number().int(),
  st: z.array(deviceShortPointSchema).length(9),
});

export type DeviceForecast = z.infer<typeof deviceForecastSchema>;

function localHourMinute(isoUtc: string, timeZone: string): { lh: number; lm: number } {
  const d = new Date(isoUtc);
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const minutePart = parts.find((p) => p.type === "minute")?.value ?? "0";
  let lh = parseInt(hourPart, 10);
  const lm = parseInt(minutePart, 10);
  if (lh === 24) {
    lh = 0;
  }
  return { lh, lm };
}

export function toDeviceForecast(data: WeatherForecastResponse): DeviceForecast {
  const { lh, lm } = localHourMinute(data.now.time, data.meta.timezone);
  const st = data.shortTerm.map((p) => ({
    h: p.offsetHours,
    t: Math.round(p.temperatureC),
    w: p.weatherCode ?? 0,
  }));
  return {
    v: 1,
    lh,
    lm,
    t: Math.round(data.now.temperatureC),
    w: data.now.weatherCode ?? 0,
    st,
  };
}

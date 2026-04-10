import { z } from "zod";

export const weatherDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weatherCode: z.number().int(),
  temperatureMaxC: z.number(),
  temperatureMinC: z.number(),
  precipitationSumMm: z.number(),
});

export const weatherForecastResponseSchema = z.object({
  location: z.object({
    name: z.string(),
    region: z.string(),
    country: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  days: z.array(weatherDaySchema).length(8),
  meta: z.object({
    forecastDays: z.literal(8),
    timezone: z.string(),
    source: z.literal("open-meteo"),
    fetchedAt: z.string().datetime({ offset: true }),
  }),
});

export type WeatherForecastResponse = z.infer<typeof weatherForecastResponseSchema>;

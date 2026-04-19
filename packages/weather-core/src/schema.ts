import { z } from "zod";

export const weatherDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weatherCode: z.number().int(),
  temperatureMaxC: z.number(),
  temperatureMinC: z.number(),
  precipitationSumMm: z.number(),
});

export const weatherNowSchema = z.object({
  time: z.string().datetime({ offset: true }),
  temperatureC: z.number(),
  weatherCode: z.number().int().optional(),
});

export const shortTermPointSchema = z.object({
  offsetHours: z.number().int().min(0).max(24),
  time: z.string().datetime({ offset: true }),
  temperatureC: z.number(),
  weatherCode: z.number().int().optional(),
});

export const weatherForecastResponseSchema = z
  .object({
    location: z.object({
      name: z.string(),
      region: z.string(),
      country: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    }),
    now: weatherNowSchema,
    shortTerm: z.array(shortTermPointSchema).length(9),
    days: z.array(weatherDaySchema).length(8),
    meta: z.object({
      forecastDays: z.literal(8),
      shortTermStepHours: z.literal(3),
      shortTermHorizonHours: z.literal(24),
      timezone: z.string(),
      source: z.literal("open-meteo"),
      fetchedAt: z.string().datetime({ offset: true }),
    }),
  })
  .superRefine((val, ctx) => {
    val.shortTerm.forEach((p, i) => {
      const expected = i * 3;
      if (p.offsetHours !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `shortTerm[${i}].offsetHours must be ${expected}`,
          path: ["shortTerm", i, "offsetHours"],
        });
      }
    });
  });

export type WeatherForecastResponse = z.infer<typeof weatherForecastResponseSchema>;

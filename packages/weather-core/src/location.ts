/** Przemyśl, Subcarpathian Voivodeship, Poland — fixed point for Open-Meteo. */
export const PRZEMYSL = {
  name: "Przemyśl",
  region: "Subcarpathian Voivodeship",
  country: "Poland",
  latitude: 49.8056,
  longitude: 22.7678,
} as const;

export const WEATHER_TIMEZONE = "Europe/Warsaw" as const;

/** Today plus the next 7 calendar days (8 daily rows). */
export const FORECAST_DAYS = 8 as const;

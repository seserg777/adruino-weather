import type { FetchFn } from "@repo/weather-core";

/** Fixed Open-Meteo-shaped payload for deterministic E2E when E2E_MOCK_OPEN_METEO=1. */
function buildMockOpenMeteoBody() {
  const daily = {
    time: [
      "2030-01-01",
      "2030-01-02",
      "2030-01-03",
      "2030-01-04",
      "2030-01-05",
      "2030-01-06",
      "2030-01-07",
      "2030-01-08",
    ],
    weather_code: [0, 1, 2, 3, 45, 48, 51, 61],
    temperature_2m_max: [5, 6, 7, 8, 9, 10, 11, 12].map((n) => n + 0.5),
    temperature_2m_min: [0, 1, 2, 3, 4, 5, 6, 7].map((n) => n + 0.25),
    precipitation_sum: [0, 0.1, 0, null, 2, 0, 0.5, 1],
  };

  const hourMs = 3600000;
  const start = Math.floor(Date.now() / hourMs) * hourMs;
  const time: string[] = [];
  const temperature_2m: number[] = [];
  const weather_code: number[] = [];
  for (let i = 0; i < 72; i++) {
    time.push(new Date(start + i * hourMs).toISOString());
    temperature_2m.push(8 + i * 0.05);
    weather_code.push(0);
  }

  return {
    utc_offset_seconds: 0,
    daily,
    hourly: { time, temperature_2m, weather_code },
  };
}

export function createE2eMockOpenMeteoFetch(): FetchFn {
  return async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url.includes("api.open-meteo.com")) {
      return new Response(JSON.stringify(buildMockOpenMeteoBody()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return fetch(input as RequestInfo | URL, init);
  };
}

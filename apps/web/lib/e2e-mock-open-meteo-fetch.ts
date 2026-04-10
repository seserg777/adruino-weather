import type { FetchFn } from "@repo/weather-core";

/** Fixed Open-Meteo-shaped payload (8 days) for deterministic E2E when E2E_MOCK_OPEN_METEO=1. */
const MOCK_OPEN_METEO_BODY = {
  daily: {
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
  },
};

export function createE2eMockOpenMeteoFetch(): FetchFn {
  return async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url.includes("api.open-meteo.com")) {
      return new Response(JSON.stringify(MOCK_OPEN_METEO_BODY), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return fetch(input as RequestInfo | URL, init);
  };
}

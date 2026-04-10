import { headers } from "next/headers";

type DayRow = {
  date: string;
  weatherCode: number;
  temperatureMaxC: number;
  temperatureMinC: number;
  precipitationSumMm: number;
};

type ApiOk = {
  location: {
    name: string;
    region: string;
    country: string;
  };
  days: DayRow[];
  meta: { fetchedAt: string; timezone: string };
};

async function loadForecast(): Promise<ApiOk> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}/api`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<ApiOk>;
}

export async function WeatherBoard() {
  let data: ApiOk;
  try {
    data = await loadForecast();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load";
    return <p role="alert">Could not load forecast: {message}</p>;
  }

  return (
    <section aria-label="8-day forecast">
      <h2>Forecast</h2>
      <p>
        <small>
          Updated {data.meta.fetchedAt} ({data.meta.timezone})
        </small>
      </p>
      <table>
        <caption className="sr-only">
          Daily weather for {data.location.name}, {data.location.country}
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Code</th>
            <th scope="col">Max °C</th>
            <th scope="col">Min °C</th>
            <th scope="col">Precip. mm</th>
          </tr>
        </thead>
        <tbody>
          {data.days.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.weatherCode}</td>
              <td>{d.temperatureMaxC.toFixed(1)}</td>
              <td>{d.temperatureMinC.toFixed(1)}</td>
              <td>{d.precipitationSumMm.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

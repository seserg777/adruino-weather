import { WeatherBoard } from "./weather-board";

export const revalidate = 300;

export default function HomePage() {
  return (
    <main>
      <h1>Weather in Przemyśl</h1>
      <p>
        Subcarpathian Voivodeship, Poland — today and the next 7 days (Open-Meteo).
      </p>
      <WeatherBoard />
    </main>
  );
}

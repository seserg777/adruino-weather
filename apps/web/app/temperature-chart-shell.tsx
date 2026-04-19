"use client";

import dynamic from "next/dynamic";
import type { ShortTermPoint } from "./temperature-chart";

const TemperatureChart = dynamic(
  () => import("./temperature-chart").then((m) => m.TemperatureChart),
  {
    ssr: false,
    loading: () => (
      <div className="temp-chart-card temp-chart-loading" aria-hidden="true">
        <p className="temp-chart-title">Next 24 hours</p>
        <div className="temp-chart-surface temp-chart-surface--placeholder" />
      </div>
    ),
  },
);

type TemperatureChartShellProps = {
  shortTerm: ShortTermPoint[];
  timezone: string;
};

export function TemperatureChartShell({
  shortTerm,
  timezone,
}: TemperatureChartShellProps) {
  return <TemperatureChart shortTerm={shortTerm} timezone={timezone} />;
}

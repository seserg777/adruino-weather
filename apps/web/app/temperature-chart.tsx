"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ShortTermPoint = {
  offsetHours: number;
  time: string;
  temperatureC: number;
  weatherCode?: number;
};

type TemperatureChartProps = {
  shortTerm: ShortTermPoint[];
  timezone: string;
};

function formatAxisLabel(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function TemperatureChart({
  shortTerm,
  timezone,
}: TemperatureChartProps) {
  const data = useMemo(
    () =>
      shortTerm.map((p) => ({
        label: formatAxisLabel(p.time, timezone),
        temp: p.temperatureC,
        offsetHours: p.offsetHours,
        isNow: p.offsetHours === 0,
      })),
    [shortTerm, timezone],
  );

  const minT = Math.min(...data.map((d) => d.temp));
  const maxT = Math.max(...data.map((d) => d.temp));
  const pad = Math.max(0.5, (maxT - minT) * 0.15 || 0.5);

  return (
    <div className="temp-chart-card">
      <div className="temp-chart-header">
        <h3 className="temp-chart-title">Next 24 hours</h3>
        <p className="temp-chart-sub">3-hour steps · {timezone}</p>
      </div>
      <div className="temp-chart-surface" aria-hidden="true">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={data}
            margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
          >
            <defs>
              <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-line)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-line)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 8"
              stroke="var(--chart-grid)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
              interval={0}
              height={36}
            />
            <YAxis
              domain={[minT - pad, maxT + pad]}
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
              tickFormatter={(v: number) => `${v.toFixed(0)}°`}
            />
            <Tooltip
              cursor={{ stroke: "var(--chart-line)", strokeOpacity: 0.35 }}
              contentStyle={{
                background: "var(--chart-tooltip-bg)",
                border: "1px solid var(--chart-tooltip-border)",
                borderRadius: "0.5rem",
                color: "var(--chart-tooltip-fg)",
              }}
              formatter={(value) =>
                typeof value === "number"
                  ? [`${value.toFixed(1)} °C`, "Temp"]
                  : ["", ""]
              }
            />
            <Area
              type="monotone"
              dataKey="temp"
              stroke="var(--chart-line)"
              strokeWidth={2.5}
              fill="url(#tempFill)"
              activeDot={{ r: 6 }}
              dot={(props: {
                cx?: number;
                cy?: number;
                payload?: { isNow?: boolean };
              }) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined) {
                  return null;
                }
                if (payload?.isNow) {
                  return (
                    <g>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={10}
                        className="temp-chart-pulse-ring"
                        fill="none"
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        className="temp-chart-now-dot"
                      />
                    </g>
                  );
                }
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={3.5}
                    fill="var(--chart-line)"
                    opacity={0.85}
                  />
                );
              }}
              animationDuration={1400}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

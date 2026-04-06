"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { DailyPainChartPoint } from "@/lib/trends";

function formatXLabel(dateStr: string, rangeDays: number): string {
  const d = new Date(dateStr + "T12:00:00");
  if (rangeDays <= 7) {
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
  }
  if (rangeDays <= 30) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  return d.toLocaleDateString("en-GB", { month: "short" });
}

function tooltipDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DailyPainChartPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg text-sm">
      <p className="font-semibold text-gray-900">{tooltipDate(d.date)}</p>
      <p className="text-blue-600">Avg: {d.avg}</p>
      <p className="text-gray-500">Range: {d.min}–{d.max}</p>
      {d.movingAvg !== null && <p className="text-gray-400">7-day avg: {d.movingAvg}</p>}
    </div>
  );
}

export default function PainOverTimeChart({
  data,
  rangeDays,
}: {
  data: DailyPainChartPoint[];
  rangeDays: number;
}) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pain Over Time</h3>
        <p className="text-gray-400 text-center py-8">No data yet</p>
      </div>
    );
  }

  // Thin out X labels for longer ranges
  const tickInterval = rangeDays <= 7 ? 0 : rangeDays <= 30 ? 2 : rangeDays <= 90 ? 6 : 13;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pain Over Time</h3>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => formatXLabel(v, rangeDays)}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            interval={tickInterval}
          />
          <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            dataKey="max"
            stroke="none"
            fill="#dbeafe"
            fillOpacity={0.6}
            type="monotone"
            isAnimationActive={false}
          />
          <Area
            dataKey="min"
            stroke="none"
            fill="#ffffff"
            fillOpacity={1}
            type="monotone"
            isAnimationActive={false}
          />
          <Line
            dataKey="avg"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={rangeDays <= 7}
            type="monotone"
            isAnimationActive={false}
          />
          <Line
            dataKey="movingAvg"
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            type="monotone"
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-1 text-center">
        Blue line = daily avg &middot; Shaded = min–max range &middot; Dashed = 7-day moving avg
      </p>
    </div>
  );
}

"use client";

import type { Summary } from "@/lib/trends";

function painColor(v: number): string {
  if (v >= 7) return "text-red-600";
  if (v >= 4) return "text-orange-500";
  return "text-green-600";
}

function trendArrow(trend: Summary["trend"]): { symbol: string; color: string } {
  if (trend === "improving") return { symbol: "\u2193", color: "text-green-600" };
  if (trend === "worsening") return { symbol: "\u2191", color: "text-red-600" };
  return { symbol: "\u2192", color: "text-gray-400" };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default function SummaryHighlights({ data }: { data: Summary }) {
  const arrow = trendArrow(data.trend);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Summary</h3>
      <div className="grid grid-cols-3 gap-3">
        {/* Current avg */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">7-day avg</p>
          <p className={`text-2xl font-bold ${data.currentAvg !== null ? painColor(data.currentAvg) : "text-gray-300"}`}>
            {data.currentAvg !== null ? data.currentAvg : "—"}
          </p>
          <span className={`text-lg font-bold ${arrow.color}`}>{arrow.symbol}</span>
        </div>

        {/* Best day */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Best day</p>
          {data.bestDay ? (
            <>
              <p className="text-2xl font-bold text-green-600">{data.bestDay.avg}</p>
              <p className="text-xs text-gray-400">{formatDate(data.bestDay.date)}</p>
            </>
          ) : (
            <p className="text-2xl font-bold text-gray-300">—</p>
          )}
        </div>

        {/* Worst day */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Worst day</p>
          {data.worstDay ? (
            <>
              <p className="text-2xl font-bold text-red-600">{data.worstDay.avg}</p>
              <p className="text-xs text-gray-400">{formatDate(data.worstDay.date)}</p>
            </>
          ) : (
            <p className="text-2xl font-bold text-gray-300">—</p>
          )}
        </div>

        {/* Days tracked */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Days tracked</p>
          <p className="text-2xl font-bold text-gray-900">{data.daysTracked}</p>
        </div>

        {/* PT adherence */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">PT adherence</p>
          <p className={`text-2xl font-bold ${data.ptAdherence !== null && data.ptAdherence >= 70 ? "text-green-600" : data.ptAdherence !== null && data.ptAdherence >= 40 ? "text-orange-500" : "text-gray-400"}`}>
            {data.ptAdherence !== null ? `${data.ptAdherence}%` : "—"}
          </p>
        </div>

        {/* Current streak */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Streak</p>
          <p className="text-2xl font-bold text-blue-600">
            {data.currentStreak > 0 ? `${data.currentStreak}d` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

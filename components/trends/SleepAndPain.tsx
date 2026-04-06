"use client";

import type { SleepPainCorrelation, SleepDistribution } from "@/lib/trends";

const SLEEP_COLORS: Record<string, { bar: string; bg: string }> = {
  terrible:  { bar: "bg-red-500",     bg: "bg-red-100" },
  poor:      { bar: "bg-orange-400",  bg: "bg-orange-100" },
  fair:      { bar: "bg-yellow-400",  bg: "bg-yellow-100" },
  good:      { bar: "bg-green-400",   bg: "bg-green-100" },
  fantastic: { bar: "bg-emerald-500", bg: "bg-emerald-100" },
};

export default function SleepAndPain({
  correlation,
  distribution,
}: {
  correlation: SleepPainCorrelation[];
  distribution: SleepDistribution[];
}) {
  const hasData = correlation.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Sleep & Pain</h3>

      {!hasData ? (
        <p className="text-gray-400 text-center py-8">No data yet</p>
      ) : (
        <>
          {/* Correlation */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Average same-day pain by sleep quality</p>
            <div className="space-y-2">
              {correlation.map((d) => {
                const colors = SLEEP_COLORS[d.quality] || { bar: "bg-gray-400", bg: "bg-gray-100" };
                return (
                  <div key={d.quality} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-20 shrink-0 capitalize">{d.quality}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.bar}`}
                        style={{ width: `${(d.avgPain / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-8 text-right">{d.avgPain}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">({d.count})</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribution */}
          {distribution.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Sleep quality distribution</p>
              <div className="flex h-6 rounded-full overflow-hidden">
                {distribution.map((d) => {
                  const colors = SLEEP_COLORS[d.quality] || { bar: "bg-gray-400", bg: "bg-gray-100" };
                  return (
                    <div
                      key={d.quality}
                      className={`${colors.bar} flex items-center justify-center`}
                      style={{ width: `${d.percent}%` }}
                      title={`${d.quality}: ${d.count} (${d.percent}%)`}
                    >
                      {d.percent >= 15 && (
                        <span className="text-xs font-semibold text-white">{d.percent}%</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">Terrible</span>
                <span className="text-xs text-gray-400">Fantastic</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

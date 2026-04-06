"use client";

import type { ActivityCorrelation } from "@/lib/trends";

function ComparisonBars({
  label1,
  val1,
  count1,
  label2,
  val2,
  count2,
}: {
  label1: string;
  val1: number;
  count1: number;
  label2: string;
  val2: number;
  count2: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-20 shrink-0 truncate">{label1}</span>
        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-400 rounded-full"
            style={{ width: `${(val1 / 10) * 100}%` }}
          />
        </div>
        <span className="text-xs font-bold text-gray-700 w-8 text-right">{val1}</span>
        <span className="text-xs text-gray-400 w-14 text-right">({count1}d)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-20 shrink-0 truncate">{label2}</span>
        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-300 rounded-full"
            style={{ width: `${(val2 / 10) * 100}%` }}
          />
        </div>
        <span className="text-xs font-bold text-gray-700 w-8 text-right">{val2}</span>
        <span className="text-xs text-gray-400 w-14 text-right">({count2}d)</span>
      </div>
    </div>
  );
}

export default function ActivityCorrelationsSection({ data }: { data: ActivityCorrelation[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Activity Correlations</h3>
        <p className="text-gray-400 text-center py-8">No data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Activity Correlations</h3>
      <p className="text-xs text-gray-400">Average daily pain on days with vs without each activity</p>

      {data.map((act) => (
        <div key={act.name} className="border-t border-gray-100 pt-3">
          <p className="text-sm font-semibold text-gray-800 mb-2">{act.name}</p>
          {!act.enough ? (
            <p className="text-xs text-gray-400 italic">Not enough data yet</p>
          ) : (
            <>
              <ComparisonBars
                label1={`With`}
                val1={act.withAvg}
                count1={act.withCount}
                label2={`Without`}
                val2={act.withoutAvg}
                count2={act.withoutCount}
              />
              {act.subBreakdown.length > 0 && (
                <div className="mt-2 ml-4 space-y-1">
                  <p className="text-xs text-gray-400">Breakdown:</p>
                  {act.subBreakdown.map((sb) => (
                    <div key={sb.label} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-16 shrink-0">{sb.label}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-300 rounded-full"
                          style={{ width: `${(sb.avg / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-600 w-8 text-right">{sb.avg}</span>
                      <span className="text-xs text-gray-400 w-10 text-right">({sb.count})</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

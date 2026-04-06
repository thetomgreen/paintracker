"use client";

import type { TimeOfDayAvg } from "@/lib/trends";

function barColor(v: number): string {
  if (v >= 7) return "bg-red-500";
  if (v >= 4) return "bg-orange-400";
  return "bg-green-500";
}

export default function PainByTimeOfDay({
  data,
  insight,
}: {
  data: TimeOfDayAvg[];
  insight: string;
}) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pain by Time of Day</h3>
        <p className="text-gray-400 text-center py-8">No data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pain by Time of Day</h3>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.key} className="flex items-center gap-2">
            <span className="text-sm text-gray-600 w-20 shrink-0">{d.label}</span>
            <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full ${barColor(d.avg)} transition-all`}
                style={{ width: `${(d.avg / 10) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-gray-700 w-8 text-right">{d.avg}</span>
          </div>
        ))}
      </div>
      {insight && (
        <p className="text-sm text-gray-500 mt-3 italic">{insight}</p>
      )}
    </div>
  );
}

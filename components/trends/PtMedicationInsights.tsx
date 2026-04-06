"use client";

import type { PtInsights, MedInsights } from "@/lib/trends";

function ComparisonBars({
  label1,
  val1,
  count1,
  label2,
  val2,
  count2,
}: {
  label1: string;
  val1: number | null;
  count1: number;
  label2: string;
  val2: number | null;
  count2: number;
}) {
  if (val1 === null && val2 === null) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-16 shrink-0">{label1}</span>
        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
          {val1 !== null && (
            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(val1 / 10) * 100}%` }} />
          )}
        </div>
        <span className="text-xs font-bold text-gray-700 w-8 text-right">{val1 ?? "—"}</span>
        <span className="text-xs text-gray-400 w-12 text-right">({count1}d)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-16 shrink-0">{label2}</span>
        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
          {val2 !== null && (
            <div className="h-full bg-gray-300 rounded-full" style={{ width: `${(val2 / 10) * 100}%` }} />
          )}
        </div>
        <span className="text-xs font-bold text-gray-700 w-8 text-right">{val2 ?? "—"}</span>
        <span className="text-xs text-gray-400 w-12 text-right">({count2}d)</span>
      </div>
    </div>
  );
}

export default function PtMedicationInsightsSection({
  pt,
  med,
}: {
  pt: PtInsights;
  med: MedInsights;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-5">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">PT & Medication</h3>

      {/* PT */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">PT Exercises</p>
        {pt.total === 0 ? (
          <p className="text-xs text-gray-400 italic">No data yet</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${pt.adherencePercent >= 70 ? "text-green-600" : pt.adherencePercent >= 40 ? "text-orange-500" : "text-red-500"}`}>
                {pt.adherencePercent}%
              </span>
              <span className="text-sm text-gray-500">adherence</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${pt.adherencePercent >= 70 ? "bg-green-500" : pt.adherencePercent >= 40 ? "bg-orange-400" : "bg-red-400"}`}
                style={{ width: `${pt.adherencePercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              No: {pt.no} &middot; Once: {pt.once} &middot; Twice: {pt.twice}
            </p>
            <ComparisonBars
              label1="With PT"
              val1={pt.painWithPt}
              count1={pt.painWithPtCount}
              label2="No PT"
              val2={pt.painWithoutPt}
              count2={pt.painWithoutPtCount}
            />
          </>
        )}
      </div>

      <hr className="border-gray-100" />

      {/* Medication */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">Oxycodone</p>
        {med.totalDays === 0 ? (
          <p className="text-xs text-gray-400 italic">No data yet</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Taken on <span className="font-bold">{med.oxyDays}</span> of {med.totalDays} days
            </p>
            <p className="text-xs text-gray-400">
              Last night: {med.lastNightDays} &middot; This afternoon: {med.afternoonDays}
            </p>
            <ComparisonBars
              label1="With oxy"
              val1={med.painWithOxy}
              count1={med.painWithOxyCount}
              label2="No oxy"
              val2={med.painWithoutOxy}
              count2={med.painWithoutOxyCount}
            />
            <p className="text-xs text-gray-400 italic mt-1">
              Higher pain on medication days likely reflects taking medication because of pain, not medication causing pain.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

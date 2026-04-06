"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const PROMPT_LABELS: Record<string, string> = {
  overnight:  "Last night",
  morning:    "Morning",
  afternoon:  "Afternoon",
  evening:    "Evening",
  bedtime:    "Bedtime",
};

interface DaySummary {
  date: string;
  pain: Record<string, number>;
  sleepQuality: string | null;
  activities: string[];
  pt: string | null;
  oxyLastNight: boolean;
  oxyAfternoon: boolean;
}

export default function HistoryPage() {
  const [days, setDays] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toLocaleDateString("en-CA"); // YYYY-MM-DD in device local time

    const [painRes, actRes, ptRes, medRes] = await Promise.all([
      supabase.from("pain_entries").select("*").gte("entry_date", fromDate).order("entry_date", { ascending: false }),
      supabase.from("activity_entries").select("*, activity_categories(name)").gte("entry_date", fromDate).eq("did_activity", true),
      supabase.from("pt_entries").select("*").gte("entry_date", fromDate),
      supabase.from("medication_entries").select("*").gte("entry_date", fromDate),
    ]);

    const dateMap = new Map<string, DaySummary>();

    function getDay(date: string): DaySummary {
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, pain: {}, sleepQuality: null, activities: [], pt: null, oxyLastNight: false, oxyAfternoon: false });
      }
      return dateMap.get(date)!;
    }

    for (const entry of painRes.data || []) {
      const day = getDay(entry.entry_date);
      day.pain[entry.prompt_type] = entry.pain_level;
      if (entry.sleep_quality) day.sleepQuality = entry.sleep_quality;
    }

    for (const entry of actRes.data || []) {
      const day = getDay(entry.entry_date);
      const catName = (entry.activity_categories as { name: string } | null)?.name || "?";
      day.activities.push(entry.sub_value ? `${catName} (${entry.sub_value})` : catName);
    }

    for (const entry of ptRes.data || []) {
      getDay(entry.entry_date).pt = entry.completed;
    }

    for (const entry of medRes.data || []) {
      const day = getDay(entry.entry_date);
      day.oxyLastNight = entry.oxycodone_last_night;
      day.oxyAfternoon = entry.oxycodone_this_afternoon;
    }

    const sorted = Array.from(dateMap.values()).sort((a, b) => b.date.localeCompare(a.date));
    setDays(sorted);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="text-sm font-medium text-blue-600">&larr; Back</Link>
        <h1 className="text-xl font-bold text-gray-900">History</h1>
        <div className="w-12" />
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {loading && <p className="text-gray-500 text-center">Loading…</p>}
        {!loading && days.length === 0 && (
          <p className="text-gray-500 text-center">No entries yet.</p>
        )}

        {days.map((day) => (
          <div key={day.date} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-bold text-gray-900">
              {new Date(day.date + "T12:00:00").toLocaleDateString("en-GB", {
                weekday: "short", day: "numeric", month: "short", year: "numeric",
              })}
            </h3>

            {/* Pain levels */}
            {Object.keys(day.pain).length > 0 && (
              <div className="space-y-1">
                {["overnight", "morning", "afternoon", "evening", "bedtime"].map((type) =>
                  day.pain[type] !== undefined ? (
                    <div key={type} className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 w-20">{PROMPT_LABELS[type]}</span>
                      <div className="flex gap-1 items-center">
                        <span className={`text-lg font-bold ${day.pain[type] >= 7 ? "text-red-600" : day.pain[type] >= 4 ? "text-orange-500" : "text-green-600"}`}>
                          {day.pain[type]}
                        </span>
                        <span className="text-xs text-gray-400">/ 10</span>
                      </div>
                      {type === "overnight" && day.sleepQuality && (
                        <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full capitalize">
                          Sleep: {day.sleepQuality}
                        </span>
                      )}
                    </div>
                  ) : null
                )}
              </div>
            )}

            {/* Activities */}
            {day.activities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {day.activities.map((act, i) => (
                  <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm">
                    {act}
                  </span>
                ))}
              </div>
            )}

            {/* PT & Medication */}
            <div className="flex gap-2 text-sm flex-wrap">
              {day.pt && (
                <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded">
                  PT: {day.pt}
                </span>
              )}
              {day.oxyLastNight && (
                <span className="px-2 py-1 bg-red-50 text-red-700 rounded">
                  Oxy last night
                </span>
              )}
              {day.oxyAfternoon && (
                <span className="px-2 py-1 bg-red-50 text-red-700 rounded">
                  Oxy afternoon
                </span>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

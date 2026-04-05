"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface DaySummary {
  date: string;
  pain: Record<string, number>;
  sleepQuality: number | null;
  activities: string[];
  pt: string | null;
  oxycodone: string | null;
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
    const fromDate = thirtyDaysAgo.toISOString().split("T")[0];

    const [painRes, actRes, catRes, ptRes, medRes] = await Promise.all([
      supabase
        .from("pain_entries")
        .select("*")
        .gte("entry_date", fromDate)
        .order("entry_date", { ascending: false }),
      supabase
        .from("activity_entries")
        .select("*, activity_categories(name)")
        .gte("entry_date", fromDate)
        .eq("did_activity", true),
      supabase.from("activity_categories").select("id, name"),
      supabase
        .from("pt_entries")
        .select("*")
        .gte("entry_date", fromDate),
      supabase
        .from("medication_entries")
        .select("*")
        .gte("entry_date", fromDate),
    ]);

    const dateMap = new Map<string, DaySummary>();

    function getDay(date: string): DaySummary {
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          pain: {},
          sleepQuality: null,
          activities: [],
          pt: null,
          oxycodone: null,
        });
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
      const catName =
        (entry.activity_categories as { name: string } | null)?.name || "?";
      let label = catName;
      if (entry.sub_value) {
        label += ` (${entry.sub_value})`;
      }
      day.activities.push(label);
    }

    for (const entry of ptRes.data || []) {
      const day = getDay(entry.entry_date);
      day.pt = entry.completed;
    }

    for (const entry of medRes.data || []) {
      const day = getDay(entry.entry_date);
      day.oxycodone = entry.oxycodone;
    }

    const sorted = Array.from(dateMap.values()).sort(
      (a, b) => b.date.localeCompare(a.date)
    );
    setDays(sorted);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="text-sm font-medium text-blue-600">
          &larr; Back
        </Link>
        <h1 className="text-xl font-bold text-gray-900">History</h1>
        <div className="w-12" />
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {loading && <p className="text-gray-500 text-center">Loading...</p>}

        {!loading && days.length === 0 && (
          <p className="text-gray-500 text-center">No entries yet.</p>
        )}

        {days.map((day) => (
          <div
            key={day.date}
            className="bg-white rounded-xl border border-gray-200 p-4 space-y-2"
          >
            <h3 className="font-bold text-gray-900">
              {new Date(day.date + "T12:00:00").toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </h3>

            {/* Pain levels */}
            {Object.keys(day.pain).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {["morning", "midday", "afternoon", "evening"].map(
                  (type) =>
                    day.pain[type] !== undefined && (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm"
                      >
                        <span className="capitalize">{type}:</span>
                        <span className="font-bold">{day.pain[type]}</span>
                      </span>
                    )
                )}
                {day.sleepQuality && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-sm">
                    Sleep: <span className="font-bold">{day.sleepQuality}</span>
                  </span>
                )}
              </div>
            )}

            {/* Activities */}
            {day.activities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {day.activities.map((act, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm"
                  >
                    {act}
                  </span>
                ))}
              </div>
            )}

            {/* PT & Medication */}
            <div className="flex gap-2 text-sm">
              {day.pt && (
                <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded">
                  PT: {day.pt}
                </span>
              )}
              {day.oxycodone && (
                <span className="px-2 py-1 bg-red-50 text-red-700 rounded">
                  Oxy: {day.oxycodone}
                </span>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

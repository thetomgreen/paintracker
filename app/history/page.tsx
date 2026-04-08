"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const PROMPT_LABELS: Record<string, string> = {
  morning:    "Morning",
  afternoon:  "Lunchtime",
  evening:    "Evening",
  bedtime:    "Bedtime",
  night:      "Night",
};

const NOTE_LABELS: Record<string, string> = {
  sleep_notes:       "Sleep notes",
  morning_general:   "General notes",
  tennis_notes:      "Tennis notes",
  lunchtime_general: "General notes",
  rest_notes:        "Rest notes",
  evening_general:   "General notes",
  tennis_bedtime:    "Tennis notes",
  pt_notes:          "PT notes",
  bedtime_general:   "General notes",
};

const NOTE_ORDER = [
  "sleep_notes", "morning_general",
  "tennis_notes", "lunchtime_general",
  "rest_notes", "evening_general",
  "tennis_bedtime", "pt_notes", "bedtime_general",
];

interface DaySummary {
  date: string;
  pain: Record<string, number>;
  sleepQuality: string | null;
  activities: string[];
  pt: string | null;
  oxyLastNight: boolean;
  oxyAfternoon: boolean;
  notes: Record<string, string>;
}

export default function HistoryPage() {
  const [days, setDays] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadHistory();
  }, []);

  function toggleNote(key: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function loadHistory() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toLocaleDateString("en-CA"); // YYYY-MM-DD in device local time

    const [painRes, actRes, ptRes, medRes, notesRes] = await Promise.all([
      supabase.from("pain_entries").select("*").gte("entry_date", fromDate).order("entry_date", { ascending: false }),
      supabase.from("activity_entries").select("*, activity_categories(name)").gte("entry_date", fromDate).eq("did_activity", true),
      supabase.from("pt_entries").select("*").gte("entry_date", fromDate),
      supabase.from("medication_entries").select("*").gte("entry_date", fromDate),
      supabase.from("notes_entries").select("entry_date, note_type, content").gte("entry_date", fromDate),
    ]);

    const dateMap = new Map<string, DaySummary>();

    function getDay(date: string): DaySummary {
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, pain: {}, sleepQuality: null, activities: [], pt: null, oxyLastNight: false, oxyAfternoon: false, notes: {} });
      }
      return dateMap.get(date)!;
    }

    for (const entry of painRes.data || []) {
      if (entry.prompt_type === "overnight") {
        // "Last night" belongs to the previous day's record, labelled "Night"
        const prev = new Date(entry.entry_date + "T12:00:00");
        prev.setDate(prev.getDate() - 1);
        const prevDate = prev.toLocaleDateString("en-CA");
        const day = getDay(prevDate);
        day.pain["night"] = entry.pain_level;
        if (entry.sleep_quality) day.sleepQuality = entry.sleep_quality;
      } else {
        const day = getDay(entry.entry_date);
        day.pain[entry.prompt_type] = entry.pain_level;
      }
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

    for (const entry of notesRes.data || []) {
      if (entry.content?.trim()) {
        getDay(entry.entry_date).notes[entry.note_type] = entry.content;
      }
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
                {["morning", "afternoon", "evening", "bedtime", "night"].map((type) =>
                  day.pain[type] !== undefined ? (
                    <div key={type} className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 w-20">{PROMPT_LABELS[type]}</span>
                      <div className="flex gap-1 items-center">
                        <span className={`text-lg font-bold ${day.pain[type] >= 7 ? "text-red-600" : day.pain[type] >= 4 ? "text-orange-500" : "text-green-600"}`}>
                          {day.pain[type]}
                        </span>
                        <span className="text-xs text-gray-400">/ 10</span>
                      </div>
                      {type === "night" && day.sleepQuality && (
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
                  Oxy lunchtime
                </span>
              )}
            </div>

            {/* Notes */}
            {NOTE_ORDER.some((type) => day.notes[type]) && (
              <div className="space-y-1 border-t border-gray-100 pt-2">
                {NOTE_ORDER.filter((type) => day.notes[type]).map((type) => {
                  const key = `${day.date}:${type}`;
                  const isExpanded = expandedNotes.has(key);
                  const content = day.notes[type];
                  const firstLine = content.split("\n")[0];
                  const preview = firstLine.length > 80 ? firstLine.slice(0, 80) + "…" : firstLine;

                  return (
                    <div key={type} className="text-sm">
                      <button
                        onClick={() => toggleNote(key)}
                        className="w-full flex items-start gap-1 text-left"
                      >
                        <span className="text-gray-400 mt-0.5 shrink-0">{isExpanded ? "▼" : "▶"}</span>
                        <span className="text-gray-500 font-medium shrink-0">{NOTE_LABELS[type]}:</span>
                        {!isExpanded && (
                          <span className="text-gray-400 truncate">{preview}</span>
                        )}
                      </button>
                      {isExpanded && (
                        <p className="mt-1 ml-4 text-gray-700 whitespace-pre-wrap">{content}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}

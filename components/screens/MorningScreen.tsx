"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const SLEEP_OPTIONS = ["terrible", "poor", "fair", "good", "fantastic"] as const;

const SLEEP_COLORS: Record<string, string> = {
  terrible: "bg-red-500 text-white",
  poor:     "bg-orange-400 text-white",
  fair:     "bg-yellow-400 text-gray-900",
  good:     "bg-green-400 text-white",
  fantastic:"bg-emerald-500 text-white",
};

const SLEEP_INACTIVE = "bg-gray-100 text-gray-700";

interface PainEntry {
  id: string;
  prompt_type: string;
  pain_level: number;
  sleep_quality: string | null;
}

export default function MorningScreen({ date }: { date: string }) {
  const [sleepQuality, setSleepQuality] = useState<string | null>(null);
  const [painLastNight, setPainLastNight] = useState<number | null>(null);
  const [painNow, setPainNow] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [overnightEntry, setOvernightEntry] = useState<PainEntry | null>(null);
  const [morningEntry, setMorningEntry] = useState<PainEntry | null>(null);

  useEffect(() => {
    loadEntries();
  }, [date]);

  async function loadEntries() {
    const { data } = await supabase
      .from("pain_entries")
      .select("*")
      .eq("entry_date", date)
      .in("prompt_type", ["overnight", "morning"]);

    for (const entry of data || []) {
      if (entry.prompt_type === "overnight") {
        setOvernightEntry(entry);
        setSleepQuality(entry.sleep_quality);
        setPainLastNight(entry.pain_level);
      }
      if (entry.prompt_type === "morning") {
        setMorningEntry(entry);
        setPainNow(entry.pain_level);
      }
    }
    if ((data || []).length > 0) setSaved(true);
  }

  async function handleSave() {
    if (!sleepQuality || painLastNight === null || painNow === null) return;
    setSaving(true);

    // Upsert overnight entry
    if (overnightEntry) {
      await supabase.from("pain_entries").update({
        sleep_quality: sleepQuality,
        pain_level: painLastNight,
      }).eq("id", overnightEntry.id);
    } else {
      const { data } = await supabase.from("pain_entries").insert({
        prompt_type: "overnight",
        pain_level: painLastNight,
        sleep_quality: sleepQuality,
        entry_date: date,
      }).select().single();
      if (data) setOvernightEntry(data);
    }

    // Upsert morning entry
    if (morningEntry) {
      await supabase.from("pain_entries").update({
        pain_level: painNow,
      }).eq("id", morningEntry.id);
    } else {
      const { data } = await supabase.from("pain_entries").insert({
        prompt_type: "morning",
        pain_level: painNow,
        entry_date: date,
      }).select().single();
      if (data) setMorningEntry(data);
    }

    setSaving(false);
    setSaved(true);
  }

  const canSave = sleepQuality !== null && painLastNight !== null && painNow !== null;

  return (
    <div className="flex flex-col gap-8">
      {/* Sleep quality */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          How did you sleep last night?
        </h2>
        <div className="flex flex-col gap-3">
          {SLEEP_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { setSleepQuality(opt); setSaved(false); }}
              className={`w-full py-4 rounded-xl text-lg font-semibold capitalize transition-all ${
                sleepQuality === opt ? SLEEP_COLORS[opt] : SLEEP_INACTIVE
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Pain last night */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          How was your level of pain last night?
        </h2>
        <PainButtons value={painLastNight} onChange={(v) => { setPainLastNight(v); setSaved(false); }} />
      </div>

      {/* Pain now */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          How is your level of pain now?
        </h2>
        <PainButtons value={painNow} onChange={(v) => { setPainNow(v); setSaved(false); }} />
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
          saved
            ? "bg-green-500 text-white"
            : canSave
            ? "bg-blue-500 text-white active:bg-blue-600"
            : "bg-gray-200 text-gray-400"
        }`}
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}

function PainButtons({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`h-14 rounded-xl text-xl font-bold transition-all ${
            value === n
              ? "bg-blue-500 text-white shadow-md scale-105"
              : "bg-gray-100 text-gray-700 active:bg-gray-200"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const SLEEP_VALUES = ["terrible", "poor", "fair", "good", "fantastic"] as const;

const SLEEP_COLORS: Record<string, string> = {
  terrible:  "bg-red-500 text-white",
  poor:      "bg-orange-400 text-white",
  fair:      "bg-yellow-400 text-gray-900",
  good:      "bg-green-400 text-white",
  fantastic: "bg-emerald-500 text-white",
};

interface PainEntry {
  id: string;
  prompt_type: string;
  pain_level: number;
  sleep_quality: string | null;
}

interface MedEntry {
  id: string;
  oxycodone_last_night: boolean;
}

/** Returns class string for a question section wrapper — red border when error, invisible border otherwise */
function sectionClass(hasError: boolean) {
  return hasError
    ? "rounded-xl border-2 border-red-300 bg-red-50 p-4"
    : "rounded-xl border-2 border-transparent p-4";
}

export default function MorningScreen({ date, onSaved }: { date: string; onSaved: () => void }) {
  const [sleepQuality,   setSleepQuality]   = useState<string | null>(null);
  const [painLastNight,  setPainLastNight]  = useState<number | null>(null);
  const [painNow,        setPainNow]        = useState<number | null>(null);
  const [oxyLastNight,   setOxyLastNight]   = useState<boolean | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [showErrors,     setShowErrors]     = useState(false);
  const [overnightEntry, setOvernightEntry] = useState<PainEntry | null>(null);
  const [morningEntry,   setMorningEntry]   = useState<PainEntry | null>(null);
  const [medEntry,       setMedEntry]       = useState<MedEntry | null>(null);

  useEffect(() => { loadEntries(); }, [date]);

  async function loadEntries() {
    const [painRes, medRes] = await Promise.all([
      supabase.from("pain_entries").select("*").eq("entry_date", date).in("prompt_type", ["overnight", "morning"]),
      supabase.from("medication_entries").select("*").eq("entry_date", date).maybeSingle(),
    ]);

    for (const entry of painRes.data || []) {
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
    if (medRes.data) {
      setMedEntry(medRes.data);
      setOxyLastNight(medRes.data.oxycodone_last_night);
    }
    if ((painRes.data || []).length > 0 || medRes.data) setSaved(true);
  }

  async function handleSave() {
    const canSave = sleepQuality !== null && painLastNight !== null && painNow !== null && oxyLastNight !== null;
    if (!canSave) { setShowErrors(true); return; }

    setSaving(true);

    if (overnightEntry) {
      await supabase.from("pain_entries")
        .update({ sleep_quality: sleepQuality, pain_level: painLastNight })
        .eq("id", overnightEntry.id);
    } else {
      const { data } = await supabase.from("pain_entries").insert({
        prompt_type: "overnight", pain_level: painLastNight,
        sleep_quality: sleepQuality, entry_date: date,
      }).select().single();
      if (data) setOvernightEntry(data);
    }

    if (morningEntry) {
      await supabase.from("pain_entries").update({ pain_level: painNow }).eq("id", morningEntry.id);
    } else {
      const { data } = await supabase.from("pain_entries").insert({
        prompt_type: "morning", pain_level: painNow, entry_date: date,
      }).select().single();
      if (data) setMorningEntry(data);
    }

    if (medEntry) {
      await supabase.from("medication_entries")
        .update({ oxycodone_last_night: oxyLastNight })
        .eq("id", medEntry.id);
    } else {
      const { data } = await supabase.from("medication_entries").insert({
        entry_date: date, oxycodone_last_night: oxyLastNight, oxycodone_this_afternoon: false,
      }).select().single();
      if (data) setMedEntry(data);
    }

    setSaving(false);
    setSaved(true);
    setShowErrors(false);
    onSaved();
  }

  const canSave = sleepQuality !== null && painLastNight !== null && painNow !== null && oxyLastNight !== null;

  return (
    <div className="flex flex-col gap-4">

      <div className={sectionClass(showErrors && !sleepQuality)}>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">How did you sleep last night?</h2>
        <SleepRating value={sleepQuality} onChange={(v) => { setSleepQuality(v); setSaved(false); }} />
      </div>

      <div className={sectionClass(showErrors && painLastNight === null)}>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">How was your level of pain last night?</h2>
        <PainRow value={painLastNight} onChange={(v) => { setPainLastNight(v); setSaved(false); }} />
      </div>

      <div className={sectionClass(showErrors && painNow === null)}>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">How is your level of pain now?</h2>
        <PainRow value={painNow} onChange={(v) => { setPainNow(v); setSaved(false); }} />
      </div>

      <div className={sectionClass(showErrors && oxyLastNight === null)}>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Did you take oxycodone last night?</h2>
        <div className="flex gap-3">
          {([true, false] as const).map((val) => (
            <button key={String(val)}
              onClick={() => { setOxyLastNight(val); setSaved(false); }}
              className={`flex-1 py-4 rounded-xl text-lg font-semibold transition-all ${
                oxyLastNight === val
                  ? val ? "bg-green-500 text-white" : "bg-gray-400 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {val ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
          saved                      ? "bg-green-500 text-white" :
          saving                     ? "bg-blue-300 text-white"  :
          showErrors && !canSave     ? "bg-red-500 text-white"   :
          canSave                    ? "bg-blue-500 text-white active:bg-blue-600" :
                                       "bg-gray-200 text-gray-400"
        }`}
      >
        {saving            ? "Saving…" :
         saved             ? "Saved ✓" :
         showErrors && !canSave ? "Please answer all the questions" :
                            "Save"}
      </button>
    </div>
  );
}

function SleepRating({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const selectedIndex = value ? SLEEP_VALUES.indexOf(value as typeof SLEEP_VALUES[number]) : -1;
  return (
    <div>
      <div className="flex gap-1.5">
        {SLEEP_VALUES.map((opt, i) => (
          <button key={opt} onClick={() => onChange(opt)}
            className={`flex-1 h-12 rounded-lg text-base font-bold transition-all ${
              selectedIndex === i
                ? SLEEP_COLORS[opt]
                : "bg-gray-100 text-gray-700 active:bg-gray-200"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-2 px-0.5">
        <span className="text-lg font-medium text-gray-500">Terrible</span>
        <span className="text-lg font-medium text-gray-500">Fantastic</span>
      </div>
    </div>
  );
}

export function PainRow({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button key={n} onClick={() => onChange(n)}
          className={`flex-1 h-12 rounded-lg text-base font-bold transition-all ${
            value === n
              ? "bg-blue-500 text-white shadow-sm scale-105"
              : "bg-gray-100 text-gray-700 active:bg-gray-200"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

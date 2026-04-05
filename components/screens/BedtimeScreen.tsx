"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import ActivityLog from "@/components/ActivityLog";
import PtEntry from "@/components/PtEntry";

const OXY_OPTIONS = [
  { value: "last_night", label: "Last night" },
  { value: "this_afternoon", label: "This afternoon" },
  { value: "no", label: "No" },
] as const;

export default function BedtimeScreen({ date }: { date: string }) {
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [painSaving, setPainSaving] = useState(false);
  const [painSaved, setPainSaved] = useState(false);
  const [painEntryId, setPainEntryId] = useState<string | null>(null);

  const [oxycodone, setOxycodone] = useState<string | null>(null);
  const [oxySaving, setOxySaving] = useState(false);
  const [oxyEntryId, setOxyEntryId] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, [date]);

  async function loadEntries() {
    const [painRes, oxyRes] = await Promise.all([
      supabase.from("pain_entries").select("*").eq("entry_date", date).eq("prompt_type", "bedtime").maybeSingle(),
      supabase.from("medication_entries").select("*").eq("entry_date", date).maybeSingle(),
    ]);

    if (painRes.data) {
      setPainLevel(painRes.data.pain_level);
      setPainEntryId(painRes.data.id);
      setPainSaved(true);
    }
    if (oxyRes.data) {
      setOxycodone(oxyRes.data.oxycodone);
      setOxyEntryId(oxyRes.data.id);
    }
  }

  async function handlePainSelect(n: number) {
    setPainLevel(n);
    setPainSaving(true);
    setPainSaved(false);

    if (painEntryId) {
      await supabase.from("pain_entries").update({ pain_level: n }).eq("id", painEntryId);
    } else {
      const { data } = await supabase.from("pain_entries").insert({
        prompt_type: "bedtime",
        pain_level: n,
        entry_date: date,
      }).select().single();
      if (data) setPainEntryId(data.id);
    }

    setPainSaving(false);
    setPainSaved(true);
  }

  async function handleOxySelect(value: string) {
    setOxycodone(value);
    setOxySaving(true);

    if (oxyEntryId) {
      await supabase.from("medication_entries").update({ oxycodone: value }).eq("id", oxyEntryId);
    } else {
      const { data } = await supabase.from("medication_entries").insert({
        entry_date: date,
        oxycodone: value,
      }).select().single();
      if (data) setOxyEntryId(data.id);
    }

    setOxySaving(false);
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Pain now */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          How is your level of pain now?
        </h2>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => handlePainSelect(n)}
              disabled={painSaving}
              className={`h-16 rounded-xl text-2xl font-bold transition-all ${
                painLevel === n
                  ? "bg-blue-500 text-white shadow-md scale-105"
                  : "bg-gray-100 text-gray-700 active:bg-gray-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {painSaved && (
          <p className="text-center text-green-600 font-semibold mt-2">Saved ✓</p>
        )}
      </div>

      <hr className="border-gray-200" />

      {/* Activities */}
      <ActivityLog date={date} />

      <hr className="border-gray-200" />

      {/* PT exercises */}
      <PtEntry date={date} />

      <hr className="border-gray-200" />

      {/* Oxycodone */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Did you take oxycodone today?
        </h2>
        <div className="flex flex-col gap-3">
          {OXY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleOxySelect(value)}
              disabled={oxySaving}
              className={`w-full py-4 rounded-xl text-lg font-semibold transition-all ${
                oxycodone === value
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-700 active:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-4" />
    </div>
  );
}

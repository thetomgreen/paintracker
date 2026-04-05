"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  date: string;
  promptType: "afternoon" | "evening";
}

export default function PainScreen({ date, promptType }: Props) {
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);

  useEffect(() => {
    loadEntry();
  }, [date, promptType]);

  async function loadEntry() {
    setPainLevel(null);
    setSaved(false);
    setEntryId(null);
    const { data } = await supabase
      .from("pain_entries")
      .select("*")
      .eq("entry_date", date)
      .eq("prompt_type", promptType)
      .maybeSingle();

    if (data) {
      setPainLevel(data.pain_level);
      setEntryId(data.id);
      setSaved(true);
    }
  }

  async function handleSelect(n: number) {
    setPainLevel(n);
    setSaving(true);
    setSaved(false);

    if (entryId) {
      await supabase.from("pain_entries").update({ pain_level: n }).eq("id", entryId);
    } else {
      const { data } = await supabase.from("pain_entries").insert({
        prompt_type: promptType,
        pain_level: n,
        entry_date: date,
      }).select().single();
      if (data) setEntryId(data.id);
    }

    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-gray-800">
        How is your level of pain now?
      </h2>

      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => handleSelect(n)}
            disabled={saving}
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

      {saved && (
        <p className="text-center text-green-600 font-semibold text-lg">
          Saved ✓
        </p>
      )}
      {saving && (
        <p className="text-center text-gray-400 text-sm">Saving…</p>
      )}
    </div>
  );
}

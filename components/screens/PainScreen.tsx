"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PainRow } from "./MorningScreen";

interface Props {
  date: string;
  promptType: "afternoon" | "evening";
  onSaved: () => void;
}

export default function PainScreen({ date, promptType, onSaved }: Props) {
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [entryId,   setEntryId]   = useState<string | null>(null);

  useEffect(() => {
    setPainLevel(null);
    setSaved(false);
    setEntryId(null);
    loadEntry();
  }, [date, promptType]);

  async function loadEntry() {
    const { data } = await supabase
      .from("pain_entries").select("*")
      .eq("entry_date", date).eq("prompt_type", promptType)
      .maybeSingle();

    if (data) {
      setPainLevel(data.pain_level);
      setEntryId(data.id);
      setSaved(true);
    }
  }

  async function handleSave() {
    if (painLevel === null) return;
    setSaving(true);

    if (entryId) {
      await supabase.from("pain_entries").update({ pain_level: painLevel }).eq("id", entryId);
    } else {
      const { data } = await supabase.from("pain_entries").insert({
        prompt_type: promptType, pain_level: painLevel, entry_date: date,
      }).select().single();
      if (data) setEntryId(data.id);
    }

    setSaving(false);
    setSaved(true);
    onSaved();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          How is your level of pain now?
        </h2>
        <PainRow value={painLevel} onChange={(v) => { setPainLevel(v); setSaved(false); }} />
      </div>

      <button
        onClick={handleSave}
        disabled={painLevel === null || saving}
        className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
          saved             ? "bg-green-500 text-white" :
          painLevel !== null ? "bg-blue-500 text-white active:bg-blue-600" :
                              "bg-gray-200 text-gray-400"
        }`}
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}

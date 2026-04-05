"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const OPTIONS = [
  { value: "last_night",    label: "Last night" },
  { value: "this_afternoon", label: "This afternoon" },
  { value: "no",            label: "No" },
] as const;

export default function MedicationEntry({ date }: { date: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    loadEntry();
  }, [date]);

  async function loadEntry() {
    const { data } = await supabase
      .from("medication_entries")
      .select("*")
      .eq("entry_date", date)
      .maybeSingle();

    if (data) {
      setSelected(data.oxycodone);
      setExistingId(data.id);
    } else {
      setSelected(null);
      setExistingId(null);
    }
  }

  async function handleSelect(value: string) {
    setSelected(value);
    setSaving(true);

    if (existingId) {
      await supabase
        .from("medication_entries")
        .update({ oxycodone: value })
        .eq("id", existingId);
    } else {
      const { data } = await supabase
        .from("medication_entries")
        .insert({ entry_date: date, oxycodone: value })
        .select()
        .single();
      if (data) setExistingId(data.id);
    }

    setSaving(false);
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-bold text-gray-900">
        Did you take oxycodone today?
      </h2>
      <div className="flex gap-2">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleSelect(value)}
            disabled={saving}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              selected === value
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

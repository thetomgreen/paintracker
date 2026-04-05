"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const OPTIONS = ["no", "once", "twice"] as const;

export default function PtEntry({ date }: { date: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    loadEntry();
  }, [date]);

  async function loadEntry() {
    const { data } = await supabase
      .from("pt_entries")
      .select("*")
      .eq("entry_date", date)
      .maybeSingle();

    if (data) {
      setSelected(data.completed);
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
        .from("pt_entries")
        .update({ completed: value })
        .eq("id", existingId);
    } else {
      const { data } = await supabase
        .from("pt_entries")
        .insert({ entry_date: date, completed: value })
        .select()
        .single();
      if (data) setExistingId(data.id);
    }

    setSaving(false);
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-bold text-gray-900">PT Exercises</h2>
      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={saving}
            className={`flex-1 py-3 rounded-lg font-medium capitalize transition-colors ${
              selected === opt
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

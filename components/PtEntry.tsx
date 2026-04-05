"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const OPTIONS = ["no", "once", "twice"] as const;

interface Props {
  date: string;
  /** Increment this from the parent to trigger a save */
  saveCounter: number;
}

export default function PtEntry({ date, saveCounter }: Props) {
  const [selected,   setSelected]   = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const isFirstRender = useRef(true);
  const selectedRef = useRef<string | null>(null);

  // Keep ref in sync so performSave always reads latest value
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useEffect(() => { loadEntry(); }, [date]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    performSave();
  }, [saveCounter]);

  async function loadEntry() {
    const { data } = await supabase
      .from("pt_entries").select("*")
      .eq("entry_date", date).maybeSingle();

    if (data) {
      setSelected(data.completed);
      setExistingId(data.id);
    } else {
      setSelected(null);
      setExistingId(null);
    }
  }

  async function performSave() {
    const value = selectedRef.current;
    if (value === null) return;

    if (existingId) {
      await supabase.from("pt_entries").update({ completed: value }).eq("id", existingId);
    } else {
      const { data } = await supabase
        .from("pt_entries").insert({ entry_date: date, completed: value })
        .select().single();
      if (data) setExistingId(data.id);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">PT exercises today</h2>
      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <button key={opt}
            onClick={() => setSelected(opt)}
            className={`flex-1 py-3 rounded-lg font-semibold capitalize transition-colors ${
              selected === opt
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

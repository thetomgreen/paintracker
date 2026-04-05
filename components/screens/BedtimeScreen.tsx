"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import ActivityLog from "@/components/ActivityLog";
import PtEntry from "@/components/PtEntry";
import { PainRow } from "./MorningScreen";

interface MedEntry {
  id: string;
  oxycodone_this_afternoon: boolean;
}

export default function BedtimeScreen({ date, onSaved }: { date: string; onSaved: () => void }) {
  const [painLevel,       setPainLevel]       = useState<number | null>(null);
  const [painEntryId,     setPainEntryId]     = useState<string | null>(null);
  const [oxyAfternoon,    setOxyAfternoon]    = useState<boolean | null>(null);
  const [medEntry,        setMedEntry]        = useState<MedEntry | null>(null);
  const [ptValue,         setPtValue]         = useState<string | null>(null);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  // Incrementing this tells ActivityLog and PtEntry to save their state
  const [saveCounter,     setSaveCounter]     = useState(0);

  const canSave = painLevel !== null && ptValue !== null && oxyAfternoon !== null;

  useEffect(() => { loadEntries(); }, [date]);

  async function loadEntries() {
    const [painRes, medRes] = await Promise.all([
      supabase.from("pain_entries").select("*").eq("entry_date", date).eq("prompt_type", "bedtime").maybeSingle(),
      supabase.from("medication_entries").select("*").eq("entry_date", date).maybeSingle(),
    ]);

    if (painRes.data) {
      setPainLevel(painRes.data.pain_level);
      setPainEntryId(painRes.data.id);
    }
    if (medRes.data) {
      setMedEntry(medRes.data);
      setOxyAfternoon(medRes.data.oxycodone_this_afternoon);
    }
    if (painRes.data || medRes.data) setSaved(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    // 1. Save bedtime pain entry
    if (painLevel !== null) {
      if (painEntryId) {
        await supabase.from("pain_entries").update({ pain_level: painLevel }).eq("id", painEntryId);
      } else {
        const { data } = await supabase.from("pain_entries").insert({
          prompt_type: "bedtime", pain_level: painLevel, entry_date: date,
        }).select().single();
        if (data) setPainEntryId(data.id);
      }
    }

    // 2. Save oxycodone_this_afternoon — update only that column
    if (oxyAfternoon !== null) {
      if (medEntry) {
        await supabase.from("medication_entries")
          .update({ oxycodone_this_afternoon: oxyAfternoon })
          .eq("id", medEntry.id);
      } else {
        const { data } = await supabase.from("medication_entries").insert({
          entry_date: date, oxycodone_this_afternoon: oxyAfternoon, oxycodone_last_night: false,
        }).select().single();
        if (data) setMedEntry(data);
      }
    }

    // 3. Tell ActivityLog and PtEntry to save (via saveCounter)
    setSaveCounter((c) => c + 1);

    setSaving(false);
    setSaved(true);
    onSaved();
  }

  return (
    <div className="flex flex-col gap-10">

      {/* Pain now */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">How is your level of pain now?</h2>
        <PainRow value={painLevel} onChange={(v) => { setPainLevel(v); setSaved(false); }} />
      </div>

      <hr className="border-gray-200" />

      {/* Activities */}
      <ActivityLog date={date} saveCounter={saveCounter} />

      <hr className="border-gray-200" />

      {/* PT exercises */}
      <PtEntry date={date} saveCounter={saveCounter} onChange={setPtValue} />

      <hr className="border-gray-200" />

      {/* Oxycodone this afternoon */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Did you take oxycodone this afternoon?
        </h2>
        <div className="flex gap-3">
          {([true, false] as const).map((val) => (
            <button key={String(val)}
              onClick={() => { setOxyAfternoon(val); setSaved(false); }}
              className={`flex-1 py-4 rounded-xl text-lg font-semibold transition-all ${
                oxyAfternoon === val
                  ? val ? "bg-green-500 text-white" : "bg-gray-400 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {val ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>

      {/* Single save button for everything */}
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
          saved    ? "bg-green-500 text-white" :
          canSave  ? "bg-blue-500 text-white active:bg-blue-600" :
                     "bg-gray-200 text-gray-400"
        }`}
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </button>

      <div className="h-4" />
    </div>
  );
}

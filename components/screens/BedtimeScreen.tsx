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

function sectionClass(hasError: boolean) {
  return hasError
    ? "rounded-xl border-2 border-red-300 bg-red-50 p-4"
    : "rounded-xl border-2 border-transparent p-4";
}

export default function BedtimeScreen({ date, onSaved }: { date: string; onSaved: () => void }) {
  const [painLevel,    setPainLevel]    = useState<number | null>(null);
  const [painEntryId,  setPainEntryId]  = useState<string | null>(null);
  const [oxyAfternoon, setOxyAfternoon] = useState<boolean | null>(null);
  const [medEntry,     setMedEntry]     = useState<MedEntry | null>(null);
  const [ptValue,      setPtValue]      = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [showErrors,   setShowErrors]   = useState(false);
  const [saveCounter,    setSaveCounter]    = useState(0);
  const [triggerComplete, setTriggerComplete] = useState(false);

  const canSave = painLevel !== null && ptValue !== null && oxyAfternoon !== null;

  // Called via effect (not directly) so child saveCounter effects fire first
  useEffect(() => {
    if (triggerComplete) onSaved();
  }, [triggerComplete]);

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
    if (!canSave) { setShowErrors(true); return; }
    setSaving(true);
    setSaved(false);

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

    setSaveCounter((c) => c + 1);
    setSaving(false);
    setSaved(true);
    setShowErrors(false);
    setTriggerComplete(true);
  }

  return (
    <div className="flex flex-col gap-4">

      <div className={sectionClass(showErrors && painLevel === null)}>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">How is your level of pain now?</h2>
        <PainRow value={painLevel} onChange={(v) => { setPainLevel(v); setSaved(false); }} />
      </div>

      <hr className="border-gray-200 mx-4" />

      <div className="px-4">
        <ActivityLog date={date} saveCounter={saveCounter} />
      </div>

      <hr className="border-gray-200 mx-4" />

      <div className={sectionClass(showErrors && ptValue === null)}>
        <PtEntry date={date} saveCounter={saveCounter} onChange={setPtValue} />
      </div>

      <hr className="border-gray-200 mx-4" />

      <div className={sectionClass(showErrors && oxyAfternoon === null)}>
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

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
          saved                  ? "bg-green-500 text-white" :
          saving                 ? "bg-blue-300 text-white"  :
          showErrors && !canSave ? "bg-red-500 text-white"   :
          canSave                ? "bg-blue-500 text-white active:bg-blue-600" :
                                   "bg-gray-200 text-gray-400"
        }`}
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </button>

      {showErrors && !canSave && (
        <p className="text-center text-red-500 font-medium">Please answer all required questions</p>
      )}

      <div className="h-4" />
    </div>
  );
}

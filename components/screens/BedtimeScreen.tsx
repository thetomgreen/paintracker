"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import ActivityLog from "@/components/ActivityLog";
import PtEntry from "@/components/PtEntry";
import { PainRow } from "./MorningScreen";
import NoteField from "@/components/NoteField";

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
  const [painLevel,         setPainLevel]         = useState<number | null>(null);
  const [painEntryId,       setPainEntryId]       = useState<string | null>(null);
  const [oxyAfternoon,      setOxyAfternoon]      = useState<boolean | null>(null);
  const [medEntry,          setMedEntry]          = useState<MedEntry | null>(null);
  const [ptValue,           setPtValue]           = useState<string | null>(null);
  const [saving,            setSaving]            = useState(false);
  const [saved,             setSaved]             = useState(false);
  const [showErrors,        setShowErrors]        = useState(false);
  const [saveCounter,       setSaveCounter]       = useState(0);
  const [triggerComplete,   setTriggerComplete]   = useState(false);
  const [tennisCheckedToday, setTennisCheckedToday] = useState(false);
  const [tennisBedtimeNote, setTennisBedtimeNote] = useState("");
  const [ptNote,            setPtNote]            = useState("");
  const [bedtimeGeneralNote, setBedtimeGeneralNote] = useState("");

  const canSave = painLevel !== null && ptValue !== null && oxyAfternoon !== null;

  // Called via effect (not directly) so child saveCounter effects fire first
  useEffect(() => {
    if (triggerComplete) onSaved();
  }, [triggerComplete]);

  useEffect(() => { loadEntries(); }, [date]);

  async function loadEntries() {
    const [painRes, medRes, tennisRes, notesRes] = await Promise.all([
      supabase.from("pain_entries").select("*").eq("entry_date", date).eq("prompt_type", "bedtime").maybeSingle(),
      supabase.from("medication_entries").select("*").eq("entry_date", date).maybeSingle(),
      supabase.from("activity_entries").select("id, activity_categories!inner(name)")
        .eq("entry_date", date).eq("did_activity", true).eq("activity_categories.name", "Tennis").maybeSingle(),
      supabase.from("notes_entries").select("note_type, content").eq("entry_date", date)
        .in("note_type", ["tennis_bedtime", "pt_notes", "bedtime_general", "tennis_notes"]),
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

    setTennisCheckedToday(!!tennisRes.data);

    // Load notes — tennis_bedtime takes priority, else pre-populate from lunchtime tennis_notes
    const noteMap: Record<string, string> = {};
    for (const note of notesRes.data || []) {
      noteMap[note.note_type] = note.content;
    }
    if (noteMap["tennis_bedtime"] !== undefined) {
      setTennisBedtimeNote(noteMap["tennis_bedtime"]);
    } else if (noteMap["tennis_notes"]) {
      setTennisBedtimeNote(noteMap["tennis_notes"]);
    }
    if (noteMap["pt_notes"] !== undefined) setPtNote(noteMap["pt_notes"]);
    if (noteMap["bedtime_general"] !== undefined) setBedtimeGeneralNote(noteMap["bedtime_general"]);
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

    const noteUpserts = [
      supabase.from("notes_entries").upsert(
        { entry_date: date, note_type: "pt_notes", content: ptNote },
        { onConflict: "entry_date,note_type" }
      ),
      supabase.from("notes_entries").upsert(
        { entry_date: date, note_type: "bedtime_general", content: bedtimeGeneralNote },
        { onConflict: "entry_date,note_type" }
      ),
    ];
    if (tennisCheckedToday) {
      noteUpserts.push(
        supabase.from("notes_entries").upsert(
          { entry_date: date, note_type: "tennis_bedtime", content: tennisBedtimeNote },
          { onConflict: "entry_date,note_type" }
        )
      );
    }
    await Promise.all(noteUpserts);

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

      {tennisCheckedToday && (
        <div className="px-4">
          <NoteField label="tennis" value={tennisBedtimeNote} onChange={setTennisBedtimeNote} />
        </div>
      )}

      <hr className="border-gray-200 mx-4" />

      <div className={sectionClass(showErrors && ptValue === null)}>
        <PtEntry date={date} saveCounter={saveCounter} onChange={setPtValue} />
        <div className="mt-3">
          <NoteField label="PT exercises" value={ptNote} onChange={setPtNote} />
        </div>
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

      <div className="px-4">
        <NoteField label="general" value={bedtimeGeneralNote} onChange={setBedtimeGeneralNote} />
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

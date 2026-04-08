"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PainRow } from "./MorningScreen";
import NoteField from "@/components/NoteField";

interface Props {
  date: string;
  promptType: "afternoon" | "evening";
  onSaved: () => void;
}

const NOTE_CONFIG = {
  afternoon: { firstType: "tennis_notes",  firstLabel: "tennis", secondType: "lunchtime_general", secondLabel: "general" },
  evening:   { firstType: "rest_notes",    firstLabel: "rest",   secondType: "evening_general",   secondLabel: "general" },
} as const;

export default function PainScreen({ date, promptType, onSaved }: Props) {
  const [painLevel,  setPainLevel]  = useState<number | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [entryId,    setEntryId]    = useState<string | null>(null);
  const [firstNote,  setFirstNote]  = useState("");
  const [secondNote, setSecondNote] = useState("");

  const noteConfig = NOTE_CONFIG[promptType];

  useEffect(() => {
    setPainLevel(null);
    setSaved(false);
    setShowErrors(false);
    setEntryId(null);
    setFirstNote("");
    setSecondNote("");
    loadEntry();
  }, [date, promptType]);

  async function loadEntry() {
    const [painRes, notesRes] = await Promise.all([
      supabase.from("pain_entries").select("*").eq("entry_date", date).eq("prompt_type", promptType).maybeSingle(),
      supabase.from("notes_entries").select("note_type, content").eq("entry_date", date).in("note_type", [noteConfig.firstType, noteConfig.secondType]),
    ]);

    if (painRes.data) {
      setPainLevel(painRes.data.pain_level);
      setEntryId(painRes.data.id);
      setSaved(true);
    }

    for (const note of notesRes.data || []) {
      if (note.note_type === noteConfig.firstType) setFirstNote(note.content);
      if (note.note_type === noteConfig.secondType) setSecondNote(note.content);
    }
  }

  async function handleSave() {
    if (painLevel === null) { setShowErrors(true); return; }
    setSaving(true);

    if (entryId) {
      await supabase.from("pain_entries").update({ pain_level: painLevel }).eq("id", entryId);
    } else {
      const { data } = await supabase.from("pain_entries").insert({
        prompt_type: promptType, pain_level: painLevel, entry_date: date,
      }).select().single();
      if (data) setEntryId(data.id);
    }

    await Promise.all([
      supabase.from("notes_entries").upsert(
        { entry_date: date, note_type: noteConfig.firstType, content: firstNote },
        { onConflict: "entry_date,note_type" }
      ),
      supabase.from("notes_entries").upsert(
        { entry_date: date, note_type: noteConfig.secondType, content: secondNote },
        { onConflict: "entry_date,note_type" }
      ),
    ]);

    setSaving(false);
    setSaved(true);
    setShowErrors(false);
    onSaved();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-xl border-2 p-4 transition-colors ${
        showErrors && painLevel === null ? "border-red-300 bg-red-50" : "border-transparent"
      }`}>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          How is your level of pain now?
        </h2>
        <PainRow value={painLevel} onChange={(v) => { setPainLevel(v); setSaved(false); }} />
        <div className="mt-3 flex flex-col gap-2">
          <NoteField label={noteConfig.firstLabel} value={firstNote} onChange={setFirstNote} />
          <NoteField label={noteConfig.secondLabel} value={secondNote} onChange={setSecondNote} />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
          saved                           ? "bg-green-500 text-white" :
          saving                          ? "bg-blue-300 text-white"  :
          showErrors && painLevel === null ? "bg-red-500 text-white"   :
          painLevel !== null              ? "bg-blue-500 text-white active:bg-blue-600" :
                                            "bg-gray-200 text-gray-400"
        }`}
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </button>
      {showErrors && painLevel === null && (
        <p className="text-center text-red-500 font-medium">Please answer all required questions</p>
      )}
    </div>
  );
}

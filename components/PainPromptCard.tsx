"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const PROMPT_LABELS: Record<string, string> = {
  morning: "How was your level of pain last night?",
  midday: "How is your level of pain now?",
  afternoon: "How is your level of pain now?",
  evening: "How is your level of pain now?",
};

const PROMPT_TIMES: Record<string, string> = {
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  evening: "Evening",
};

interface PainEntry {
  id: string;
  prompt_type: string;
  pain_level: number;
  sleep_quality: number | null;
  entry_date: string;
}

export default function PainPromptCard({
  promptType,
  existingEntry,
  onSaved,
}: {
  promptType: string;
  existingEntry: PainEntry | null;
  onSaved: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [painLevel, setPainLevel] = useState<number | null>(
    existingEntry?.pain_level ?? null
  );
  const [sleepQuality, setSleepQuality] = useState<number | null>(
    existingEntry?.sleep_quality ?? null
  );
  const [saving, setSaving] = useState(false);

  const isMorning = promptType === "morning";

  async function handleSave() {
    if (painLevel === null) return;
    if (isMorning && sleepQuality === null) return;

    setSaving(true);
    const today = new Date().toISOString().split("T")[0];

    if (existingEntry) {
      await supabase
        .from("pain_entries")
        .update({
          pain_level: painLevel,
          sleep_quality: isMorning ? sleepQuality : null,
        })
        .eq("id", existingEntry.id);
    } else {
      await supabase.from("pain_entries").insert({
        prompt_type: promptType,
        pain_level: painLevel,
        sleep_quality: isMorning ? sleepQuality : null,
        entry_date: today,
      });
    }

    setSaving(false);
    setIsOpen(false);
    onSaved();
  }

  const isCompleted = existingEntry !== null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`w-full rounded-xl p-4 text-left transition-colors ${
          isCompleted
            ? "bg-green-50 border-2 border-green-200"
            : "bg-white border-2 border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              {PROMPT_TIMES[promptType]}
            </p>
            <p className="text-base font-semibold text-gray-900">
              {PROMPT_LABELS[promptType]}
            </p>
          </div>
          {isCompleted ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-600">
                {existingEntry.pain_level}
              </span>
              {isMorning && existingEntry.sleep_quality && (
                <span className="text-sm text-gray-500">
                  Sleep: {existingEntry.sleep_quality}
                </span>
              )}
              <span className="text-green-500 text-xl">&#10003;</span>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Tap to record</span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl p-4 bg-white border-2 border-blue-300 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-blue-600">
          {PROMPT_TIMES[promptType]}
        </p>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 text-sm"
        >
          Cancel
        </button>
      </div>

      <div>
        <p className="text-base font-semibold text-gray-900 mb-3">
          {PROMPT_LABELS[promptType]}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPainLevel(n)}
              className={`h-12 rounded-lg font-bold text-lg transition-colors ${
                painLevel === n
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {isMorning && (
        <div>
          <p className="text-base font-semibold text-gray-900 mb-3">
            How was your sleep last night?
          </p>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setSleepQuality(n)}
                className={`h-12 rounded-lg font-bold text-lg transition-colors ${
                  sleepQuality === n
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={
          saving || painLevel === null || (isMorning && sleepQuality === null)
        }
        className="w-full h-12 rounded-lg bg-blue-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
      >
        {saving ? "Saving..." : existingEntry ? "Update" : "Save"}
      </button>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import PainPromptCard from "@/components/PainPromptCard";
import ActivityLog from "@/components/ActivityLog";
import PtEntry from "@/components/PtEntry";
import MedicationEntry from "@/components/MedicationEntry";
import Link from "next/link";

const PROMPT_TYPES = ["morning", "midday", "afternoon", "evening"] as const;

interface PainEntry {
  id: string;
  prompt_type: string;
  pain_level: number;
  sleep_quality: number | null;
  entry_date: string;
}

export default function Home() {
  const today = new Date().toISOString().split("T")[0];

  const [painEntries, setPainEntries] = useState<Record<string, PainEntry>>({});

  const loadPainEntries = useCallback(async () => {
    const { data } = await supabase
      .from("pain_entries")
      .select("*")
      .eq("entry_date", today);

    const map: Record<string, PainEntry> = {};
    for (const entry of data || []) {
      map[entry.prompt_type] = entry;
    }
    setPainEntries(map);
  }, [today]);

  useEffect(() => {
    loadPainEntries();
  }, [loadPainEntries]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Pain Tracker</h1>
        <div className="flex gap-3">
          <Link
            href="/history"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            History
          </Link>
          <Link
            href="/settings"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Settings
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Pain Levels
          </h2>
          {PROMPT_TYPES.map((type) => (
            <PainPromptCard
              key={type}
              promptType={type}
              existingEntry={painEntries[type] || null}
              onSaved={loadPainEntries}
            />
          ))}
        </section>

        <hr className="border-gray-200" />

        <section>
          <ActivityLog date={today} />
        </section>

        <hr className="border-gray-200" />

        <section>
          <PtEntry date={today} />
        </section>

        <hr className="border-gray-200" />

        <section>
          <MedicationEntry date={today} />
        </section>

        <div className="h-8" />
      </main>
    </div>
  );
}

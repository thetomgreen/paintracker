"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MorningScreen from "@/components/screens/MorningScreen";
import PainScreen from "@/components/screens/PainScreen";
import BedtimeScreen from "@/components/screens/BedtimeScreen";

type ScreenType = "morning" | "afternoon" | "evening" | "bedtime";

const SCREEN_CONFIG: Record<ScreenType, { label: string; emoji: string }> = {
  morning:   { label: "Morning",   emoji: "🌅" },
  afternoon: { label: "Afternoon", emoji: "☀️"  },
  evening:   { label: "Evening",   emoji: "🌤️" },
  bedtime:   { label: "Bedtime",   emoji: "🌙" },
};

const THANK_YOU_MSG: Record<ScreenType, string> = {
  morning:   "Thanks for entering your data. Don't forget to complete your exercises today.",
  afternoon: "Thanks for entering your data. Don't forget to complete your exercises today.",
  evening:   "Thanks for entering your data. Don't forget to complete your exercises today.",
  bedtime:   "Thanks, and sleep well — good night.",
};

const THANK_YOU_EMOJI: Record<ScreenType, string> = {
  morning:   "🏋️",
  afternoon: "🏋️",
  evening:   "🏋️",
  bedtime:   "🌙",
};

function getCurrentScreen(): ScreenType {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return "morning";
  if (hour >= 12 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 20) return "evening";
  return "bedtime";
}

export default function Home() {
  const today = new Date().toISOString().split("T")[0];
  const [screen,    setScreen]    = useState<ScreenType>(getCurrentScreen());
  const [thankYou,  setThankYou]  = useState(false);
  const [resetKey,  setResetKey]  = useState(0);
  const [resetting, setResetting] = useState(false);

  const config = SCREEN_CONFIG[screen];

  function switchScreen(s: ScreenType) {
    setScreen(s);
    setThankYou(false);
  }

  async function handleReset() {
    setResetting(true);
    await Promise.all([
      supabase.from("pain_entries").delete().eq("entry_date", today),
      supabase.from("activity_entries").delete().eq("entry_date", today),
      supabase.from("pt_entries").delete().eq("entry_date", today),
      supabase.from("medication_entries").delete().eq("entry_date", today),
    ]);
    setThankYou(false);
    setResetKey((k) => k + 1); // force remount of screen components
    setResetting(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <span className="text-2xl">{config.emoji}</span>
          <span className="ml-2 text-xl font-bold text-gray-900">{config.label}</span>
        </div>
        <div className="flex gap-4">
          <Link href="/history" className="text-sm font-medium text-blue-600">History</Link>
          <Link href="/settings" className="text-sm font-medium text-blue-600">Settings</Link>
        </div>
      </header>

      {/* Screen content */}
      <main className="max-w-lg mx-auto px-4 py-8">
        {thankYou ? (
          <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
            <span className="text-6xl">{THANK_YOU_EMOJI[screen]}</span>
            <p className="text-xl font-medium text-gray-700 leading-relaxed max-w-sm">
              {THANK_YOU_MSG[screen]}
            </p>
          </div>
        ) : (
          <>
            {screen === "morning"   && <MorningScreen key={resetKey} date={today} onSaved={() => setThankYou(true)} />}
            {screen === "afternoon" && <PainScreen    key={resetKey} date={today} promptType="afternoon" onSaved={() => setThankYou(true)} />}
            {screen === "evening"   && <PainScreen    key={resetKey} date={today} promptType="evening"   onSaved={() => setThankYou(true)} />}
            {screen === "bedtime"   && <BedtimeScreen key={resetKey} date={today} onSaved={() => setThankYou(true)} />}
          </>
        )}
      </main>

      {/* Dev screen switcher */}
      <div className="fixed bottom-0 left-0 right-0 bg-yellow-50 border-t-2 border-yellow-300 px-3 py-2">
        <p className="text-center text-xs text-yellow-700 font-medium mb-1 uppercase tracking-wide">
          Test mode — tap to switch screen
        </p>
        <div className="flex gap-2 max-w-lg mx-auto mb-2">
          {(Object.keys(SCREEN_CONFIG) as ScreenType[]).map((s) => (
            <button
              key={s}
              onClick={() => switchScreen(s)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                screen === s
                  ? "bg-yellow-400 text-yellow-900"
                  : "bg-white text-gray-600 border border-gray-300"
              }`}
            >
              {SCREEN_CONFIG[s].emoji} {SCREEN_CONFIG[s].label}
            </button>
          ))}
        </div>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="w-full max-w-lg mx-auto block py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-700 border border-red-300 disabled:opacity-50"
        >
          {resetting ? "Resetting…" : "🗑 Reset today's data"}
        </button>
      </div>

      <div className="h-24" />
    </div>
  );
}

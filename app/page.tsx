"use client";

import { useState } from "react";
import Link from "next/link";
import MorningScreen from "@/components/screens/MorningScreen";
import PainScreen from "@/components/screens/PainScreen";
import BedtimeScreen from "@/components/screens/BedtimeScreen";

type ScreenType = "morning" | "afternoon" | "evening" | "bedtime";

const SCREEN_CONFIG: Record<ScreenType, { label: string; emoji: string; timeHint: string }> = {
  morning:   { label: "Morning",   emoji: "🌅", timeHint: "9:00 am" },
  afternoon: { label: "Afternoon", emoji: "☀️",  timeHint: "1:00 pm" },
  evening:   { label: "Evening",   emoji: "🌤️", timeHint: "5:00 pm" },
  bedtime:   { label: "Bedtime",   emoji: "🌙", timeHint: "9:00 pm" },
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
  const [screen, setScreen] = useState<ScreenType>(getCurrentScreen());

  const config = SCREEN_CONFIG[screen];

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
        {screen === "morning"   && <MorningScreen date={today} />}
        {screen === "afternoon" && <PainScreen date={today} promptType="afternoon" />}
        {screen === "evening"   && <PainScreen date={today} promptType="evening" />}
        {screen === "bedtime"   && <BedtimeScreen date={today} />}
      </main>

      {/* Dev screen switcher — remove before going live */}
      <div className="fixed bottom-0 left-0 right-0 bg-yellow-50 border-t-2 border-yellow-300 px-3 py-2">
        <p className="text-center text-xs text-yellow-700 font-medium mb-2 uppercase tracking-wide">
          Test mode — tap to switch screen
        </p>
        <div className="flex gap-2 max-w-lg mx-auto">
          {(Object.keys(SCREEN_CONFIG) as ScreenType[]).map((s) => (
            <button
              key={s}
              onClick={() => setScreen(s)}
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
      </div>

      {/* Padding so content isn't hidden behind the dev bar */}
      <div className="h-24" />
    </div>
  );
}

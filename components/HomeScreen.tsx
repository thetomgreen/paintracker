"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MorningScreen from "@/components/screens/MorningScreen";
import PainScreen from "@/components/screens/PainScreen";
import BedtimeScreen from "@/components/screens/BedtimeScreen";

type ScreenType = "morning" | "lunchtime" | "evening" | "bedtime";

// Maps UI screen name to the prompt_type value stored in the DB
const DB_PROMPT_TYPE: Record<ScreenType, string> = {
  morning:   "morning",
  lunchtime: "afternoon",
  evening:   "evening",
  bedtime:   "bedtime",
};

const SCREEN_CONFIG: Record<ScreenType, { label: string; emoji: string }> = {
  morning:   { label: "Morning",   emoji: "🌅" },
  lunchtime: { label: "Lunchtime", emoji: "☀️"  },
  evening:   { label: "Evening",   emoji: "🌤️" },
  bedtime:   { label: "Bedtime",   emoji: "🌙" },
};

const THANK_YOU_MSG: Record<ScreenType, string> = {
  morning:   "Thanks for entering your data. Don't forget to complete your exercises today.",
  lunchtime: "Thanks for entering your data. Don't forget to complete your exercises today.",
  evening:   "Thanks for entering your data. Don't forget to complete your exercises today.",
  bedtime:   "Thanks, and sleep well — good night.",
};

const THANK_YOU_EMOJI: Record<ScreenType, string> = {
  morning:   "🏋️",
  lunchtime: "🏋️",
  evening:   "🏋️",
  bedtime:   "🌙",
};

// For each screen, which screen comes next and which DB column holds its scheduled time
const NEXT_SCREEN: Partial<Record<ScreenType, { screen: ScreenType; timeKey: string; label: string }>> = {
  morning:   { screen: "lunchtime", timeKey: "afternoon_time", label: "lunchtime" },
  lunchtime: { screen: "evening",   timeKey: "evening_time",   label: "evening"   },
  evening:   { screen: "bedtime",   timeKey: "bedtime_time",   label: "bedtime"   },
  // bedtime has no next screen
};

function getCurrentScreen(): ScreenType {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return "morning";
  if (hour >= 12 && hour < 16) return "lunchtime";
  if (hour >= 16 && hour < 20) return "evening";
  return "bedtime";
}

function isWithin2HoursBefore(timeStr: string): boolean {
  const now = new Date();
  const [h, m] = timeStr.split(":").map(Number);
  const scheduled = new Date();
  scheduled.setHours(h, m, 0, 0);
  const twoHoursBefore = new Date(scheduled.getTime() - 2 * 60 * 60 * 1000);
  return now >= twoHoursBefore;
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, "0")}${period}`;
}

type PtYesterdayState = "loading" | "missing" | "no" | "once" | "twice";

export default function HomeScreen({ devMode = false, promptParam }: { devMode?: boolean; promptParam?: string }) {
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in device local time
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString("en-CA"); })();
  const initialScreen = (promptParam && promptParam in SCREEN_CONFIG) ? promptParam as ScreenType : getCurrentScreen();
  const [screen,          setScreen]          = useState<ScreenType>(initialScreen);
  const [thankYou,        setThankYou]        = useState(false);
  const skipAlreadyDoneCheck = useRef(!!promptParam && promptParam in SCREEN_CONFIG);
  const [resetKey,        setResetKey]        = useState(0);
  const [resetting,       setResetting]       = useState(false);
  const [notifTimes,      setNotifTimes]      = useState<Record<string, string>>({});
  const [checking,        setChecking]        = useState(true); // avoids flash of form before DB check
  const [ptYesterday,     setPtYesterday]     = useState<PtYesterdayState>("loading");
  const [ptStreak,        setPtStreak]        = useState(0);
  const [ptTwiceStreak,   setPtTwiceStreak]   = useState(0);

  // Load PT yesterday status whenever the thank-you screen appears (non-bedtime only)
  useEffect(() => {
    if (!thankYou || screen === "bedtime") return;
    setPtYesterday("loading");
    setPtStreak(0);
    setPtTwiceStreak(0);
    loadPtYesterday();
  }, [thankYou, screen]);

  async function loadPtYesterday() {
    const { data } = await supabase
      .from("pt_entries")
      .select("completed")
      .eq("entry_date", yesterday)
      .maybeSingle();

    if (!data) {
      setPtYesterday("missing");
      return;
    }

    const completed = data.completed as PtYesterdayState;
    setPtYesterday(completed);

    if (completed === "once" || completed === "twice") {
      await calculatePtStreaks();
    }
  }

  async function calculatePtStreaks() {
    const { data } = await supabase
      .from("pt_entries")
      .select("entry_date, completed")
      .lte("entry_date", yesterday)
      .order("entry_date", { ascending: false });

    if (!data) return;

    const entryMap = new Map(data.map((e: { entry_date: string; completed: string }) => [e.entry_date, e.completed]));

    let streak = 0;
    let twiceStreak = 0;
    let streakBroken = false;
    let twiceStreakBroken = false;

    const d = new Date(yesterday + "T12:00:00");
    for (let i = 0; i < 3650; i++) {
      const dateStr = d.toLocaleDateString("en-CA");
      const completed = entryMap.get(dateStr);

      if (!streakBroken) {
        if (completed === "once" || completed === "twice") streak++;
        else streakBroken = true;
      }

      if (!twiceStreakBroken) {
        if (completed === "twice") twiceStreak++;
        else twiceStreakBroken = true;
      }

      if (streakBroken && twiceStreakBroken) break;
      d.setDate(d.getDate() - 1);
    }

    setPtStreak(streak);
    setPtTwiceStreak(twiceStreak);
  }

  async function savePtYesterday(value: "no" | "once" | "twice") {
    await supabase
      .from("pt_entries")
      .upsert({ entry_date: yesterday, completed: value }, { onConflict: "entry_date" });

    setPtYesterday(value);

    if (value === "once" || value === "twice") {
      await calculatePtStreaks();
    }
  }

  // Load notification times once (for button labels)
  useEffect(() => {
    async function loadTimes() {
      if (!supabase) return;
      const { data } = await supabase.from("notification_settings").select("*").maybeSingle();
      if (data) setNotifTimes(data);
    }
    loadTimes();
  }, []);

  // When screen changes, check if data already entered → skip straight to thank-you
  // Exception: if launched from a notification tap, show the form directly regardless
  useEffect(() => {
    async function checkAlreadyDone() {
      setChecking(true);
      setThankYou(false);
      if (!supabase) { setChecking(false); return; }
      if (skipAlreadyDoneCheck.current) {
        skipAlreadyDoneCheck.current = false;
        setChecking(false);
        return;
      }
      const { data } = await supabase
        .from("pain_entries")
        .select("id")
        .eq("entry_date", today)
        .eq("prompt_type", DB_PROMPT_TYPE[screen])
        .maybeSingle();
      if (data) setThankYou(true);
      setChecking(false);
    }
    checkAlreadyDone();
  }, [screen, today]);

  const config   = SCREEN_CONFIG[screen];
  const nextInfo = NEXT_SCREEN[screen];

  function switchScreen(s: ScreenType) {
    setScreen(s);
  }

  async function handleReset() {
    setResetting(true);
    if (supabase) {
      await Promise.all([
        supabase.from("pain_entries").delete().eq("entry_date", today),
        supabase.from("activity_entries").delete().eq("entry_date", today),
        supabase.from("pt_entries").delete().eq("entry_date", today),
        supabase.from("medication_entries").delete().eq("entry_date", today),
      ]);
    }
    setThankYou(false);
    setResetKey((k) => k + 1);
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
          <Link href="/trends" className="text-sm font-medium text-blue-600">Trends</Link>
          <Link href="/history" className="text-sm font-medium text-blue-600">History</Link>
          <Link href="/settings" className="text-sm font-medium text-blue-600">Settings</Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-8">
        {checking ? null : thankYou ? (
          <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">

            {screen === "bedtime" ? (
              <>
                <span className="text-6xl">🌙</span>
                <p className="text-xl font-medium text-gray-700 leading-relaxed max-w-sm">
                  Thanks, and sleep well — good night.
                </p>
              </>
            ) : (
              <>
                {/* ── Loading ── */}
                {ptYesterday === "loading" && (
                  <>
                    <span className="text-6xl">🤸</span>
                    <p className="text-xl font-medium text-gray-700">Thanks for entering your data.</p>
                  </>
                )}

                {/* ── Ask about yesterday ── */}
                {ptYesterday === "missing" && (
                  <>
                    <span className="text-6xl">🤸</span>
                    <p className="text-xl font-medium text-gray-700">Thanks for entering your data.</p>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 w-full max-w-sm text-left space-y-3">
                      <p className="font-medium text-gray-800">Did you do your PT exercises yesterday?</p>
                      <div className="flex gap-2">
                        {(["no", "once", "twice"] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() => savePtYesterday(v)}
                            className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold capitalize"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Streak display ── */}
                {(ptYesterday === "once" || ptYesterday === "twice") && (
                  <div className="w-full max-w-sm space-y-4">
                    {/* Thanks header */}
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">📋✅</span>
                      <p className="text-lg font-medium text-gray-700">Thanks for entering your data.</p>
                    </div>

                    {/* Streak headline */}
                    <p className="text-xl font-semibold text-gray-800">
                      You&apos;re on a {ptStreak} day streak with your PT exercises — great work!
                    </p>

                    {/* Stretching icon + big streak number */}
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-6xl">🤸</span>
                      <span
                        className="font-black leading-none text-transparent bg-clip-text"
                        style={{
                          fontSize: "5rem",
                          backgroundImage: "linear-gradient(135deg, #22c55e, #16a34a)",
                        }}
                      >
                        {ptStreak}
                      </span>
                    </div>

                    {/* Keep it up callout */}
                    <div className="rounded-xl px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                      <p className="font-bold text-blue-700">
                        Keep it up! Today, can you do them twice? 💪
                      </p>
                    </div>

                    {/* Streak counts */}
                    <div className="space-y-2">
                      <p className="text-lg font-bold text-emerald-600">
                        PT exercise streak: {ptStreak} {ptStreak === 1 ? "day" : "days"}
                      </p>
                      <p className={`text-base font-semibold ${ptTwiceStreak > 0 ? "text-purple-600" : "text-red-500"}`}>
                        PT exercise twice in a day streak: {ptTwiceStreak} {ptTwiceStreak === 1 ? "day" : "days"}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Missed yesterday ── */}
                {ptYesterday === "no" && (
                  <>
                    <span className="text-6xl">🤸</span>
                    <p className="text-xl font-medium text-gray-700 leading-relaxed max-w-sm">
                      You missed your exercises yesterday. That&apos;s ok, you can get back at it today!
                    </p>
                  </>
                )}
              </>
            )}

            {nextInfo && notifTimes[nextInfo.timeKey] && isWithin2HoursBefore(notifTimes[nextInfo.timeKey]) && (
              <button
                onClick={() => switchScreen(nextInfo.screen)}
                className="mt-2 px-6 py-4 bg-blue-500 text-white rounded-xl text-base font-semibold active:bg-blue-600"
              >
                Enter {nextInfo.label} data now
                {notifTimes[nextInfo.timeKey] && (
                  <span className="block text-sm font-normal opacity-80 mt-0.5">
                    scheduled for {formatTime(notifTimes[nextInfo.timeKey])}
                  </span>
                )}
              </button>
            )}
          </div>
        ) : (
          <>
            {screen === "morning"   && <MorningScreen key={resetKey} date={today} onSaved={() => setThankYou(true)} />}
            {screen === "lunchtime" && <PainScreen    key={resetKey} date={today} promptType="afternoon" onSaved={() => setThankYou(true)} />}
            {screen === "evening"   && <PainScreen    key={resetKey} date={today} promptType="evening"   onSaved={() => setThankYou(true)} />}
            {screen === "bedtime"   && <BedtimeScreen key={resetKey} date={today} onSaved={() => setThankYou(true)} />}
          </>
        )}
      </main>

      {/* Dev bar — only shown in dev mode */}
      {devMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-50 border-t-2 border-yellow-300 px-3 py-2">
          <p className="text-center text-xs text-yellow-700 font-medium mb-1 uppercase tracking-wide">
            Test mode — tap to switch screen
          </p>
          <div className="flex gap-2 max-w-lg mx-auto">
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
            <button
              onClick={handleReset}
              disabled={resetting}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-700 border border-red-300 disabled:opacity-50"
            >
              {resetting ? "…" : "🗑"}
            </button>
          </div>
        </div>
      )}

      <div className={devMode ? "h-24" : "h-4"} />
    </div>
  );
}

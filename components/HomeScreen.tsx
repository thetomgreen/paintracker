"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MorningScreen from "@/components/screens/MorningScreen";
import PainScreen from "@/components/screens/PainScreen";
import BedtimeScreen from "@/components/screens/BedtimeScreen";

type ScreenType = "morning" | "lunchtime" | "evening" | "bedtime";

/** Moon animation pool — one picked at random each time bedtime thank-you appears */
const MOON_ANIMATIONS: string[] = [
  "moonFloat      3s   ease-in-out infinite",          // 1  gentle bob
  "moonBreath     5s   ease-in-out infinite",          // 2  slow breathe
  "moonSway       4s   ease-in-out infinite",          // 3  pendulum rock
  "moonRise       0.9s ease-out      forwards",        // 4  rises from below
  "moonSpin       12s  linear        infinite",        // 5  dreamy full spin
  "moonTwinkle    3.5s ease-in-out   infinite",        // 6  gentle shimmer
  "moonDrift      6s   ease-in-out   infinite",        // 7  tide sway
  "moonHeartbeat  2.2s ease-in-out   infinite",        // 8  double pulse
  "moonZoomIn     0.7s cubic-bezier(0.34,1.56,0.64,1) forwards", // 9  spring in
  "moonFadeIn     1.8s ease-in       forwards",        // 10 slow appear
  "moonDrop       0.75s ease-out     forwards",        // 11 drop & bounce
  "moonShimmer    2.5s ease-in-out   infinite",        // 12 glow pulse
  "moonOrbit      5s   linear        infinite",        // 13 slow orbit
  "moonNod        3s   ease-in-out   infinite",        // 14 forward nod
  "moonWobble     0.9s ease-in-out   forwards",        // 15 quick jiggle
  "moonFlicker    5s   linear        infinite",        // 16 starlight blink
  "moonSpiralIn   1s   ease-out      forwards",        // 17 spiral materialise
  "moonRockSlow   1.6s ease-in-out   forwards",        // 18 rocks to stillness
  "moonBounceUp   1.1s ease-in-out   forwards",        // 19 springing bounce
  "moonPop        0.7s ease-in-out   forwards",        // 20 bold pop
];

const BOOK_QUOTES = [
  "Your pain is real, and understanding it can loosen its grip.",
  "A sensitized nervous system can change.",
  "Fear can amplify pain, but safety can soften it.",
  "Healing often begins when mind and body stop being treated as enemies.",
  "Pain has many ingredients, which means it has many openings for relief.",
  "Understanding pain can reduce it.",
  "Chronic pain is not always a life sentence.",
  "Small shifts in sleep, stress, movement, and belief can change the pain experience.",
  "Your body may be overprotecting you, not betraying you.",
];

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

// Ordered list of screens (earliest to latest in the day)
const SCREEN_ORDER: ScreenType[] = ["morning", "lunchtime", "evening", "bedtime"];
const screenIndex = (s: ScreenType) => SCREEN_ORDER.indexOf(s);

// For the "back to previous period" backfill button
const PREV_SCREEN: Partial<Record<ScreenType, ScreenType>> = {
  lunchtime: "morning",
  evening:   "lunchtime",
  bedtime:   "evening",
};

function getPreviousPeriodKey(today: string, yesterday: string, screen: ScreenType): string {
  if (screen === "morning")   return `${yesterday}-evening`;
  if (screen === "lunchtime") return `${today}-morning`;
  if (screen === "evening")   return `${today}-lunchtime`;
  return "";
}

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
  const [ptToday,             setPtToday]             = useState<string | null>(null);
  const [ptTodayPrev,         setPtTodayPrev]         = useState<string | null>(null);
  const [streakAnimKey,       setStreakAnimKey]        = useState(0);
  const [ptStreakSaved,       setPtStreakSaved]        = useState(0);
  const [ptTwiceStreakSaved,  setPtTwiceStreakSaved]   = useState(0);
  const [savedFlash,          setSavedFlash]           = useState(false);
  const [showBookReminder,    setShowBookReminder]     = useState(false);
  const [bookQuoteIndex,      setBookQuoteIndex]       = useState(0);
  const [moonAnimIndex,       setMoonAnimIndex]        = useState(0);
  // Screens that have no pain_entries row for today — drives the "Back to X" and "Enter X now" backfill buttons
  const [missingPeriods,      setMissingPeriods]       = useState<Set<ScreenType>>(new Set());
  // The screen the user first landed on — anchors the 2-step backward limit
  const originalScreenRef = useRef<ScreenType>(initialScreen);

  // After save, show a brief "Thanks" flash on the form screen then switch to thank-you
  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => { setSavedFlash(false); setThankYou(true); }, 1500);
    return () => clearTimeout(t);
  }, [savedFlash]);

  // Load PT status whenever the thank-you screen appears.
  // Always fetches both yesterday and today so the streak correctly
  // includes today if PT was already logged via the button earlier.
  useEffect(() => {
    if (!thankYou) return;
    if (screen === "bedtime") {
      setMoonAnimIndex(Math.floor(Math.random() * MOON_ANIMATIONS.length));
    }
    setPtYesterday("loading");
    setPtStreak(0);
    setPtTwiceStreak(0);
    setPtToday(null);
    setPtTodayPrev(null);
    loadPtAll();
  }, [thankYou, screen]);

  async function loadPtAll() {
    if (screen === "bedtime") {
      const { data } = await supabase
        .from("pt_entries").select("completed").eq("entry_date", today).maybeSingle();
      const completed = (data?.completed ?? null) as PtYesterdayState | null;
      setPtYesterday(completed ?? "missing");
      setPtToday(completed);
      if (completed === "once" || completed === "twice") {
        await calculatePtStreaks(today);
      }
    } else {
      // Fetch yesterday and today in parallel
      const [yRes, tRes] = await Promise.all([
        supabase.from("pt_entries").select("completed").eq("entry_date", yesterday).maybeSingle(),
        supabase.from("pt_entries").select("completed").eq("entry_date", today).maybeSingle(),
      ]);
      const yCompleted = (yRes.data?.completed ?? null) as PtYesterdayState | null;
      const tCompleted = tRes.data?.completed ?? null;
      setPtYesterday(yCompleted ?? "missing");
      setPtToday(tCompleted);
      // If PT already done today, streak runs from today; otherwise from yesterday
      if (tCompleted && tCompleted !== "no") {
        await calculatePtStreaks(today);
      } else if (yCompleted === "once" || yCompleted === "twice") {
        await calculatePtStreaks(yesterday);
      }
    }
  }

  async function calculatePtStreaks(fromDate: string) {
    const { data } = await supabase
      .from("pt_entries")
      .select("entry_date, completed")
      .lte("entry_date", fromDate)
      .order("entry_date", { ascending: false });

    if (!data) return;

    const entryMap = new Map(data.map((e: { entry_date: string; completed: string }) => [e.entry_date, e.completed]));

    let streak = 0;
    let twiceStreak = 0;
    let streakBroken = false;
    let twiceStreakBroken = false;

    const d = new Date(fromDate + "T12:00:00");
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
      await calculatePtStreaks(yesterday);
    }
  }

  async function handlePtTodayLog() {
    const next = (!ptToday || ptToday === "no") ? "once" : "twice";
    // Save current streaks so undo can restore them exactly
    setPtStreakSaved(ptStreak);
    setPtTwiceStreakSaved(ptTwiceStreak);
    setPtTodayPrev(ptToday ?? "no");
    setPtToday(next);
    await supabase
      .from("pt_entries")
      .upsert({ entry_date: today, completed: next }, { onConflict: "entry_date" });
    // Recalculate streaks from today (now includes today's entry) then animate
    await calculatePtStreaks(today);
    setStreakAnimKey((k) => k + 1);
  }

  async function handlePtTodayUndo() {
    const prev = ptTodayPrev;
    setPtTodayPrev(null);
    if (!prev || prev === "no") {
      setPtToday(null);
      await supabase.from("pt_entries").delete().eq("entry_date", today);
    } else {
      setPtToday(prev);
      await supabase
        .from("pt_entries")
        .upsert({ entry_date: today, completed: prev }, { onConflict: "entry_date" });
    }
    // Quietly restore the saved streak values — no recalculation, no animation
    setPtStreak(ptStreakSaved);
    setPtTwiceStreak(ptTwiceStreakSaved);
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
      setSavedFlash(false);
      setShowBookReminder(false);
      if (!supabase) { setChecking(false); return; }
      if (skipAlreadyDoneCheck.current) {
        skipAlreadyDoneCheck.current = false;
        setChecking(false);
        return;
      }
      // Fetch all periods for today so we can show the backfill buttons.
      const { data: todaysEntries } = await supabase
        .from("pain_entries")
        .select("prompt_type")
        .eq("entry_date", today)
        .in("prompt_type", SCREEN_ORDER.map((s) => DB_PROMPT_TYPE[s]));
      const donePrompts = new Set<string>(
        (todaysEntries ?? []).map((e: { prompt_type: string }) => e.prompt_type)
      );
      const missing = new Set<ScreenType>(
        SCREEN_ORDER.filter((s) => !donePrompts.has(DB_PROMPT_TYPE[s]))
      );
      setMissingPeriods(missing);
      const currentDone = donePrompts.has(DB_PROMPT_TYPE[screen]);
      if (currentDone) {
        setThankYou(true);
      } else if (screen !== "bedtime") {
        // 1-in-4 chance of showing the book reminder, but not two periods in a row
        const roll = Math.floor(Math.random() * 4) + 1;
        if (roll === 4) {
          const prevKey = getPreviousPeriodKey(today, yesterday, screen);
          const lastShownAt = typeof window !== "undefined"
            ? localStorage.getItem("bookReminderShownAt") ?? ""
            : "";
          if (lastShownAt !== prevKey) {
            const currentKey = `${today}-${screen}`;
            const rawIdx = typeof window !== "undefined"
              ? parseInt(localStorage.getItem("bookReminderQuoteIndex") ?? "0", 10)
              : 0;
            const idx = isNaN(rawIdx) ? 0 : rawIdx % BOOK_QUOTES.length;
            setBookQuoteIndex(idx);
            if (typeof window !== "undefined") {
              localStorage.setItem("bookReminderShownAt", currentKey);
              localStorage.setItem("bookReminderQuoteIndex", String((idx + 1) % BOOK_QUOTES.length));
            }
            setShowBookReminder(true);
          }
        }
      }
      setChecking(false);
    }
    checkAlreadyDone();
  }, [screen, today]);

  const config   = SCREEN_CONFIG[screen];
  const nextInfo = NEXT_SCREEN[screen];

  function switchScreen(s: ScreenType) {
    setScreen(s);
  }

  function handleSaved() {
    // Optimistically mark the current screen as no longer missing so the
    // thank-you "Enter next data" backfill logic sees the right state
    setMissingPeriods((p) => {
      if (!p.has(screen)) return p;
      const next = new Set(p);
      next.delete(screen);
      return next;
    });
    setSavedFlash(true);
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
    setSavedFlash(false);
    setShowBookReminder(false);
    // All entries wiped — every screen is now missing until re-entered
    setMissingPeriods(new Set(SCREEN_ORDER));
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
        {checking ? null : showBookReminder ? (
          /* Book reminder interstitial — shown 1-in-4 times before data entry */
          <div className="flex flex-col items-center gap-6 py-12 text-center max-w-sm mx-auto">
            <p className="text-xl font-semibold text-gray-800 leading-snug">
              Just a friendly reminder to keep reading{" "}
              <em>Tell Me Where It Hurts: The New Science of Pain and How to Heal</em>.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 w-full text-left">
              <p className="text-gray-700 italic leading-relaxed">
                &ldquo;{BOOK_QUOTES[bookQuoteIndex]}&rdquo;
              </p>
            </div>
            <button
              onClick={() => setShowBookReminder(false)}
              className="px-6 py-4 bg-blue-500 text-white rounded-xl text-base font-semibold active:bg-blue-600 w-full"
            >
              Enter {config.label.toLowerCase()} data
            </button>
          </div>
        ) : savedFlash ? (
          /* Brief "Thanks" flash shown on the form screen before transitioning */
          <div className="flex flex-col items-center justify-center gap-5 py-24 text-center"
               style={{ animation: "ptFlashIn 0.3s ease-out" }}>
            <span className="text-7xl">✅</span>
            <p className="text-2xl font-semibold text-green-700">Thanks for entering your data.</p>
          </div>
        ) : thankYou ? (
          <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">

            {screen === "bedtime" ? (
              <>
                {/* Streak content if PT done today (no "keep it up" callout) */}
                {(ptYesterday === "once" || ptYesterday === "twice") && (
                  <div className="w-full max-w-sm space-y-4">
                    <p className="text-xl font-semibold text-gray-800">
                      You&apos;re on a {ptStreak} day streak with your PT exercises — great work!
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-6xl">🤸</span>
                      <span
                        className="font-black leading-none text-transparent bg-clip-text"
                        style={{ fontSize: "5rem", backgroundImage: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                      >
                        {ptStreak}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-bold text-emerald-600">
                        PT exercise streak: {ptStreak} {ptStreak === 1 ? "day" : "days"}
                      </p>
                      <p className={`text-base font-semibold ${ptTwiceStreak > 0 ? "text-purple-600" : "text-red-500"}`}>
                        PT exercise twice in a day streak: {ptTwiceStreak} {ptTwiceStreak === 1 ? "day" : "days"}
                      </p>
                    </div>

                    <p className="text-lg font-medium text-gray-600 pt-1">
                      Sleep well — good night.
                    </p>
                    <span style={{ fontSize: "5.5rem", lineHeight: 1, display: "inline-block", animation: MOON_ANIMATIONS[moonAnimIndex] }}>🌙</span>
                  </div>
                )}
                {/* Message if PT not done or still loading */}
                {ptYesterday !== "once" && ptYesterday !== "twice" && (
                  <div className="space-y-4 text-center">
                    <p className="text-xl font-medium text-gray-700 leading-relaxed max-w-sm">
                      {ptYesterday === "no"
                        ? "No PT today - sometimes we all need a break - back on it tomorrow!"
                        : "Thanks, and sleep well — good night."}
                    </p>
                    {ptYesterday === "no" && (
                      <p className="text-xl font-medium text-gray-600">Sleep well — good night.</p>
                    )}
                    <span style={{ fontSize: "5.5rem", lineHeight: 1, display: "inline-block", animation: MOON_ANIMATIONS[moonAnimIndex] }}>🌙</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* ── Loading ── */}
                {ptYesterday === "loading" && (
                  <span className="text-6xl">🤸</span>
                )}

                {/* ── Ask about yesterday ── */}
                {ptYesterday === "missing" && (
                  <>
                    <span className="text-6xl">🤸</span>
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
                    {/* Streak headline */}
                    <p className="text-xl font-semibold text-gray-800">
                      You&apos;re on a {ptStreak} day streak with your PT exercises — great work!
                    </p>

                    {/* Stretching icon + big streak number */}
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-6xl">🤸</span>
                      <span
                        key={streakAnimKey}
                        className="font-black leading-none text-transparent bg-clip-text"
                        style={{
                          fontSize: "5rem",
                          backgroundImage: "linear-gradient(135deg, #22c55e, #16a34a)",
                          animation: streakAnimKey > 0 ? "ptStreakPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" : "none",
                        }}
                      >
                        {ptStreak}
                      </span>
                    </div>

                    {/* Keep it up + log button — hidden once already done twice */}
                    {ptToday !== "twice" && (
                      <div className="rounded-xl px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                        <p className="font-bold text-blue-700">
                          Keep it up! Today, can you do them twice? 💪
                        </p>
                      </div>
                    )}

                    {/* PT log today button — hidden once done twice (unless undo in play) */}
                    {(ptToday !== "twice" || ptTodayPrev !== null) && (
                      <div className="flex items-center gap-2">
                        {ptTodayPrev !== null ? (
                          <>
                            <div className="flex-1 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold text-center">
                              {ptToday === "twice" ? "Done twice today ✓" : "Done once today ✓"}
                            </div>
                            <button onClick={handlePtTodayUndo} className="py-2 w-20 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium shrink-0">
                              Undo
                            </button>
                          </>
                        ) : (
                          <button onClick={handlePtTodayLog} className="flex-1 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-semibold border border-green-200">
                            {ptToday === "once" ? "I've done PT a second time today" : "I've done my PT today"}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Streak counts */}
                    {(() => {
                      // When the user has logged PT once today (first button press) and had a
                      // twice streak going, show an optimistic count as if they'll do it again
                      const optimistic = ptTodayPrev !== null && ptToday === "once" && ptTwiceStreakSaved > 0;
                      const twiceDisplay = optimistic ? ptTwiceStreakSaved + 1 : ptTwiceStreak;
                      return (
                        <div
                          key={streakAnimKey}
                          className="space-y-2"
                          style={{ animation: streakAnimKey > 0 ? "ptStreakSlide 0.45s ease-out 0.15s both" : "none" }}
                        >
                          <p className="text-lg font-bold text-emerald-600">
                            PT exercise streak: {ptStreak} {ptStreak === 1 ? "day" : "days"}
                          </p>
                          <p className={`text-base font-semibold ${twiceDisplay > 0 ? "text-purple-600" : "text-red-500"}`}>
                            PT exercise twice in a day streak: {twiceDisplay} {twiceDisplay === 1 ? "day" : "days"}
                          </p>
                          {optimistic && (
                            <p className="text-sm font-semibold text-purple-600">(if you do PT a second time today)</p>
                          )}
                        </div>
                      );
                    })()}
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

            {(() => {
              if (!nextInfo) return null;
              const hasScheduledTime = !!notifTimes[nextInfo.timeKey];
              const withinScheduled =
                hasScheduledTime && isWithin2HoursBefore(notifTimes[nextInfo.timeKey]);
              // Backfill continue: next period has no data and is at or before
              // the screen we originally landed on (i.e. we haven't overshot today)
              const backfillOriginalIdx = screenIndex(originalScreenRef.current);
              const backfillNextIdx = screenIndex(nextInfo.screen);
              const backfillContinue =
                missingPeriods.has(nextInfo.screen) &&
                backfillNextIdx <= backfillOriginalIdx;
              if (!withinScheduled && !backfillContinue) return null;
              return (
                <button
                  onClick={() => switchScreen(nextInfo.screen)}
                  className="mt-2 px-6 py-4 bg-blue-500 text-white rounded-xl text-base font-semibold active:bg-blue-600"
                >
                  Enter {nextInfo.label} data now
                  {hasScheduledTime && (
                    <span className="block text-sm font-normal opacity-80 mt-0.5">
                      scheduled for {formatTime(notifTimes[nextInfo.timeKey])}
                    </span>
                  )}
                </button>
              );
            })()}
          </div>
        ) : (
          <>
            {(() => {
              // Back-to-previous-period button: shown when the previous period has
              // no data and is within 2 steps of the screen we originally landed on
              const prevScreen = PREV_SCREEN[screen];
              const originalIdx = screenIndex(originalScreenRef.current);
              const prevIdx = prevScreen ? screenIndex(prevScreen) : -1;
              const canGoBack =
                !!prevScreen &&
                missingPeriods.has(prevScreen) &&
                originalIdx - prevIdx <= 2;
              if (!canGoBack || !prevScreen) return null;
              return (
                <button
                  onClick={() => switchScreen(prevScreen)}
                  className="mb-4 w-full py-3 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-xl active:bg-blue-50 flex items-center justify-center gap-1"
                >
                  ← Back to {SCREEN_CONFIG[prevScreen].label.toLowerCase()}
                </button>
              );
            })()}
            {screen === "morning"   && <MorningScreen key={resetKey} date={today} onSaved={handleSaved} />}
            {screen === "lunchtime" && <PainScreen    key={resetKey} date={today} promptType="afternoon" onSaved={handleSaved} />}
            {screen === "evening"   && <PainScreen    key={resetKey} date={today} promptType="evening"   onSaved={handleSaved} />}
            {screen === "bedtime"   && <BedtimeScreen key={resetKey} date={today} onSaved={handleSaved} />}
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

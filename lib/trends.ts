// Pure computation functions for the Trends page — no React, no Supabase

export interface PainEntry {
  id: string;
  prompt_type: string;
  pain_level: number;
  sleep_quality: string | null;
  entry_date: string;
}

export interface ActivityEntry {
  id: string;
  category_id: string;
  entry_date: string;
  did_activity: boolean;
  sub_value: string | null;
  activity_categories: { name: string; sub_prompt_type: string } | null;
}

export interface PtEntry {
  id: string;
  entry_date: string;
  completed: string;
}

export interface MedEntry {
  id: string;
  entry_date: string;
  oxycodone_last_night: boolean;
  oxycodone_this_afternoon: boolean;
}

export interface ActivityCategory {
  id: string;
  name: string;
  sub_prompt_type: string;
}

// ---------- helpers ----------

function previousDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA");
}

/** Effective date for a pain entry: overnight → previous day, else entry_date */
function effectiveDate(entry: PainEntry): string {
  return entry.prompt_type === "overnight" ? previousDay(entry.entry_date) : entry.entry_date;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------- daily aggregation ----------

export interface DailyPain {
  date: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export function computeDailyPain(painEntries: PainEntry[]): DailyPain[] {
  const byDate = new Map<string, number[]>();
  for (const e of painEntries) {
    const d = effectiveDate(e);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(e.pain_level);
  }

  const result: DailyPain[] = [];
  for (const [date, levels] of byDate) {
    result.push({
      date,
      avg: round1(avg(levels)),
      min: Math.min(...levels),
      max: Math.max(...levels),
      count: levels.length,
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export interface DailyPainChartPoint {
  date: string;
  avg: number;
  min: number;
  max: number;
  movingAvg: number | null;
}

export function computePainOverTime(dailyPain: DailyPain[]): DailyPainChartPoint[] {
  return dailyPain.map((day, i) => {
    // 7-day moving average (centred where possible)
    const windowStart = Math.max(0, i - 3);
    const windowEnd = Math.min(dailyPain.length - 1, i + 3);
    const window = dailyPain.slice(windowStart, windowEnd + 1);
    const ma = window.length >= 3 ? round1(avg(window.map((d) => d.avg))) : null;
    return { date: day.date, avg: day.avg, min: day.min, max: day.max, movingAvg: ma };
  });
}

// ---------- summary ----------

export interface Summary {
  currentAvg: number | null;
  previousAvg: number | null;
  trend: "improving" | "worsening" | "stable";
  bestDay: { date: string; avg: number } | null;
  worstDay: { date: string; avg: number } | null;
  daysTracked: number;
  currentStreak: number;
  ptAdherence: number | null; // 0–100
}

export function computeSummary(
  dailyPain: DailyPain[],
  ptEntries: PtEntry[],
): Summary {
  const today = new Date().toLocaleDateString("en-CA");

  // Last 7 and prior 7 days
  const d7 = new Date();
  d7.setDate(d7.getDate() - 7);
  const d14 = new Date();
  d14.setDate(d14.getDate() - 14);
  const d7Str = d7.toLocaleDateString("en-CA");
  const d14Str = d14.toLocaleDateString("en-CA");

  const last7 = dailyPain.filter((d) => d.date > d7Str);
  const prior7 = dailyPain.filter((d) => d.date > d14Str && d.date <= d7Str);

  const currentAvg = last7.length > 0 ? round1(avg(last7.map((d) => d.avg))) : null;
  const previousAvg = prior7.length > 0 ? round1(avg(prior7.map((d) => d.avg))) : null;

  let trend: "improving" | "worsening" | "stable" = "stable";
  if (currentAvg !== null && previousAvg !== null) {
    const diff = currentAvg - previousAvg;
    if (diff < -0.5) trend = "improving";
    else if (diff > 0.5) trend = "worsening";
  }

  let bestDay: { date: string; avg: number } | null = null;
  let worstDay: { date: string; avg: number } | null = null;
  for (const d of dailyPain) {
    if (!bestDay || d.avg < bestDay.avg) bestDay = { date: d.date, avg: d.avg };
    if (!worstDay || d.avg > worstDay.avg) worstDay = { date: d.date, avg: d.avg };
  }

  // Current streak (consecutive days from today backwards)
  let streak = 0;
  const dateSet = new Set(dailyPain.map((d) => d.date));
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = cursor.toLocaleDateString("en-CA");
    if (dateSet.has(ds)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // PT adherence
  let ptAdherence: number | null = null;
  if (ptEntries.length > 0) {
    const done = ptEntries.filter((p) => p.completed !== "no").length;
    ptAdherence = Math.round((done / ptEntries.length) * 100);
  }

  return { currentAvg, previousAvg, trend, bestDay, worstDay, daysTracked: dailyPain.length, currentStreak: streak, ptAdherence };
}

// ---------- time of day ----------

export interface TimeOfDayAvg {
  key: string;
  label: string;
  avg: number;
  count: number;
}

const TOD_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Lunchtime",
  evening: "Evening",
  bedtime: "Bedtime",
  overnight: "Night",
};

const TOD_ORDER = ["morning", "afternoon", "evening", "bedtime", "overnight"];

export function computeTimeOfDay(painEntries: PainEntry[]): { data: TimeOfDayAvg[]; insight: string } {
  const groups = new Map<string, number[]>();
  for (const e of painEntries) {
    if (!groups.has(e.prompt_type)) groups.set(e.prompt_type, []);
    groups.get(e.prompt_type)!.push(e.pain_level);
  }

  const data: TimeOfDayAvg[] = TOD_ORDER
    .filter((k) => groups.has(k))
    .map((k) => ({
      key: k,
      label: TOD_LABELS[k] || k,
      avg: round1(avg(groups.get(k)!)),
      count: groups.get(k)!.length,
    }));

  let insight = "";
  if (data.length >= 2) {
    const sorted = [...data].sort((a, b) => a.avg - b.avg);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    insight = `Your pain tends to be highest at ${worst.label.toLowerCase()} (avg ${worst.avg}) and lowest at ${best.label.toLowerCase()} (avg ${best.avg}).`;
  }

  return { data, insight };
}

// ---------- activity correlations ----------

export interface ActivityCorrelation {
  name: string;
  subPromptType: string;
  withAvg: number;
  withCount: number;
  withoutAvg: number;
  withoutCount: number;
  subBreakdown: { label: string; avg: number; count: number }[];
  enough: boolean;
}

export function computeActivityCorrelations(
  painEntries: PainEntry[],
  activityEntries: ActivityEntry[],
  categories: ActivityCategory[],
): ActivityCorrelation[] {
  // Daily avg pain (using effective dates)
  const dailyAvg = new Map<string, number>();
  const byDate = new Map<string, number[]>();
  for (const e of painEntries) {
    const d = effectiveDate(e);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(e.pain_level);
  }
  for (const [date, levels] of byDate) {
    dailyAvg.set(date, avg(levels));
  }

  const allDates = new Set(dailyAvg.keys());

  // Activity dates per category
  const actDates = new Map<string, Set<string>>();
  const actSubValues = new Map<string, Map<string, string[]>>(); // catId → date → sub_values
  for (const e of activityEntries) {
    if (!e.did_activity) continue;
    if (!actDates.has(e.category_id)) actDates.set(e.category_id, new Set());
    actDates.get(e.category_id)!.add(e.entry_date);
    if (e.sub_value) {
      if (!actSubValues.has(e.category_id)) actSubValues.set(e.category_id, new Map());
      const dateMap = actSubValues.get(e.category_id)!;
      if (!dateMap.has(e.entry_date)) dateMap.set(e.entry_date, []);
      dateMap.get(e.entry_date)!.push(e.sub_value);
    }
  }

  return categories.map((cat) => {
    const didDates = actDates.get(cat.id) || new Set<string>();
    const withPain: number[] = [];
    const withoutPain: number[] = [];

    for (const date of allDates) {
      const pain = dailyAvg.get(date)!;
      if (didDates.has(date)) withPain.push(pain);
      else withoutPain.push(pain);
    }

    // Sub-value breakdown
    const subBreakdown: { label: string; avg: number; count: number }[] = [];
    const subMap = actSubValues.get(cat.id);

    if (subMap && cat.sub_prompt_type === "distance") {
      // Distance buckets
      const buckets: Record<string, number[]> = { "0–1 mi": [], "1–2 mi": [], "2–3 mi": [], "3+ mi": [] };
      for (const [date, vals] of subMap) {
        const pain = dailyAvg.get(date);
        if (pain === undefined) continue;
        const dist = parseFloat(vals[0]) || 0;
        if (dist <= 1) buckets["0–1 mi"].push(pain);
        else if (dist <= 2) buckets["1–2 mi"].push(pain);
        else if (dist <= 3) buckets["2–3 mi"].push(pain);
        else buckets["3+ mi"].push(pain);
      }
      for (const [label, pains] of Object.entries(buckets)) {
        if (pains.length > 0) subBreakdown.push({ label, avg: round1(avg(pains)), count: pains.length });
      }
    } else if (subMap && cat.sub_prompt_type === "intensity") {
      const groups: Record<string, number[]> = { light: [], medium: [], heavy: [] };
      for (const [date, vals] of subMap) {
        const pain = dailyAvg.get(date);
        if (pain === undefined) continue;
        const level = vals[0]?.toLowerCase();
        if (level && groups[level]) groups[level].push(pain);
      }
      for (const [label, pains] of Object.entries(groups)) {
        if (pains.length > 0) subBreakdown.push({ label: label.charAt(0).toUpperCase() + label.slice(1), avg: round1(avg(pains)), count: pains.length });
      }
    } else if (subMap && cat.sub_prompt_type === "boolean") {
      const groups: Record<string, number[]> = { yes: [], no: [] };
      for (const [date, vals] of subMap) {
        const pain = dailyAvg.get(date);
        if (pain === undefined) continue;
        const v = vals[0]?.toLowerCase();
        if (v && groups[v]) groups[v].push(pain);
      }
      for (const [label, pains] of Object.entries(groups)) {
        if (pains.length > 0) subBreakdown.push({ label: label.charAt(0).toUpperCase() + label.slice(1), avg: round1(avg(pains)), count: pains.length });
      }
    }

    return {
      name: cat.name,
      subPromptType: cat.sub_prompt_type,
      withAvg: round1(avg(withPain)),
      withCount: withPain.length,
      withoutAvg: round1(avg(withoutPain)),
      withoutCount: withoutPain.length,
      subBreakdown,
      enough: withPain.length >= 3 && withoutPain.length >= 3,
    };
  });
}

// ---------- sleep & pain ----------

export interface SleepPainCorrelation {
  quality: string;
  avgPain: number;
  count: number;
}

export interface SleepDistribution {
  quality: string;
  count: number;
  percent: number;
}

const SLEEP_ORDER = ["terrible", "poor", "fair", "good", "fantastic"];

export function computeSleepAndPain(
  painEntries: PainEntry[],
): { correlation: SleepPainCorrelation[]; distribution: SleepDistribution[] } {
  // Group overnight entries by sleep quality
  const overnightByQuality = new Map<string, string[]>(); // quality → entry_dates
  for (const e of painEntries) {
    if (e.prompt_type === "overnight" && e.sleep_quality) {
      if (!overnightByQuality.has(e.sleep_quality)) overnightByQuality.set(e.sleep_quality, []);
      overnightByQuality.get(e.sleep_quality)!.push(e.entry_date);
    }
  }

  // Average ALL pain entries for each entry_date (no date shift — overnight shares entry_date with same-day entries)
  const painByDate = new Map<string, number[]>();
  for (const e of painEntries) {
    if (!painByDate.has(e.entry_date)) painByDate.set(e.entry_date, []);
    painByDate.get(e.entry_date)!.push(e.pain_level);
  }

  const correlation: SleepPainCorrelation[] = SLEEP_ORDER
    .filter((q) => overnightByQuality.has(q))
    .map((q) => {
      const dates = overnightByQuality.get(q)!;
      const pains: number[] = [];
      for (const d of dates) {
        const dayPains = painByDate.get(d);
        if (dayPains) pains.push(avg(dayPains));
      }
      return { quality: q, avgPain: round1(avg(pains)), count: dates.length };
    });

  // Distribution
  let totalSleep = 0;
  const counts = new Map<string, number>();
  for (const e of painEntries) {
    if (e.prompt_type === "overnight" && e.sleep_quality) {
      counts.set(e.sleep_quality, (counts.get(e.sleep_quality) || 0) + 1);
      totalSleep++;
    }
  }
  const distribution: SleepDistribution[] = SLEEP_ORDER
    .filter((q) => counts.has(q))
    .map((q) => ({
      quality: q,
      count: counts.get(q)!,
      percent: totalSleep > 0 ? Math.round((counts.get(q)! / totalSleep) * 100) : 0,
    }));

  return { correlation, distribution };
}

// ---------- PT & medication ----------

export interface PtInsights {
  total: number;
  no: number;
  once: number;
  twice: number;
  adherencePercent: number;
  painWithPt: number | null;
  painWithPtCount: number;
  painWithoutPt: number | null;
  painWithoutPtCount: number;
}

export interface MedInsights {
  totalDays: number;
  oxyDays: number;
  lastNightDays: number;
  afternoonDays: number;
  painWithOxy: number | null;
  painWithOxyCount: number;
  painWithoutOxy: number | null;
  painWithoutOxyCount: number;
}

export function computePtInsights(painEntries: PainEntry[], ptEntries: PtEntry[]): PtInsights {
  const no = ptEntries.filter((p) => p.completed === "no").length;
  const once = ptEntries.filter((p) => p.completed === "once").length;
  const twice = ptEntries.filter((p) => p.completed === "twice").length;
  const total = ptEntries.length;
  const adherencePercent = total > 0 ? Math.round(((once + twice) / total) * 100) : 0;

  // Daily avg pain
  const dailyAvg = new Map<string, number>();
  const byDate = new Map<string, number[]>();
  for (const e of painEntries) {
    const d = effectiveDate(e);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(e.pain_level);
  }
  for (const [date, levels] of byDate) dailyAvg.set(date, avg(levels));

  const ptDates = new Set(ptEntries.filter((p) => p.completed !== "no").map((p) => p.entry_date));
  const noPtDates = new Set(ptEntries.filter((p) => p.completed === "no").map((p) => p.entry_date));

  const withPt: number[] = [];
  const withoutPt: number[] = [];
  for (const [date, pain] of dailyAvg) {
    if (ptDates.has(date)) withPt.push(pain);
    else if (noPtDates.has(date)) withoutPt.push(pain);
  }

  return {
    total, no, once, twice, adherencePercent,
    painWithPt: withPt.length > 0 ? round1(avg(withPt)) : null,
    painWithPtCount: withPt.length,
    painWithoutPt: withoutPt.length > 0 ? round1(avg(withoutPt)) : null,
    painWithoutPtCount: withoutPt.length,
  };
}

export function computeMedInsights(painEntries: PainEntry[], medEntries: MedEntry[]): MedInsights {
  const totalDays = medEntries.length;
  const lastNightDays = medEntries.filter((m) => m.oxycodone_last_night).length;
  const afternoonDays = medEntries.filter((m) => m.oxycodone_this_afternoon).length;
  const oxyDays = medEntries.filter((m) => m.oxycodone_last_night || m.oxycodone_this_afternoon).length;

  const dailyAvg = new Map<string, number>();
  const byDate = new Map<string, number[]>();
  for (const e of painEntries) {
    const d = effectiveDate(e);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(e.pain_level);
  }
  for (const [date, levels] of byDate) dailyAvg.set(date, avg(levels));

  const oxyDateSet = new Set(medEntries.filter((m) => m.oxycodone_last_night || m.oxycodone_this_afternoon).map((m) => m.entry_date));
  const noOxyDateSet = new Set(medEntries.filter((m) => !m.oxycodone_last_night && !m.oxycodone_this_afternoon).map((m) => m.entry_date));

  const withOxy: number[] = [];
  const withoutOxy: number[] = [];
  for (const [date, pain] of dailyAvg) {
    if (oxyDateSet.has(date)) withOxy.push(pain);
    else if (noOxyDateSet.has(date)) withoutOxy.push(pain);
  }

  return {
    totalDays, oxyDays, lastNightDays, afternoonDays,
    painWithOxy: withOxy.length > 0 ? round1(avg(withOxy)) : null,
    painWithOxyCount: withOxy.length,
    painWithoutOxy: withoutOxy.length > 0 ? round1(avg(withoutOxy)) : null,
    painWithoutOxyCount: withoutOxy.length,
  };
}

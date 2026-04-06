"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  computeDailyPain,
  computePainOverTime,
  computeSummary,
  computeTimeOfDay,
  computeActivityCorrelations,
  computeSleepAndPain,
  computePtInsights,
  computeMedInsights,
  type PainEntry,
  type ActivityEntry,
  type ActivityCategory,
  type PtEntry,
  type MedEntry,
  type DailyPain,
  type DailyPainChartPoint,
  type Summary,
  type TimeOfDayAvg,
  type ActivityCorrelation,
  type SleepPainCorrelation,
  type SleepDistribution,
  type PtInsights,
  type MedInsights,
} from "@/lib/trends";

import TimeRangeSelector from "./TimeRangeSelector";
import SummaryHighlights from "./SummaryHighlights";
import PainOverTimeChart from "./PainOverTimeChart";
import PainByTimeOfDay from "./PainByTimeOfDay";
import ActivityCorrelationsSection from "./ActivityCorrelations";
import SleepAndPain from "./SleepAndPain";
import PtMedicationInsightsSection from "./PtMedicationInsights";

interface ComputedData {
  dailyPain: DailyPain[];
  chartData: DailyPainChartPoint[];
  summary: Summary;
  todData: TimeOfDayAvg[];
  todInsight: string;
  actCorrelations: ActivityCorrelation[];
  sleepCorrelation: SleepPainCorrelation[];
  sleepDistribution: SleepDistribution[];
  ptInsights: PtInsights;
  medInsights: MedInsights;
}

export default function TrendsPage() {
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ComputedData | null>(null);

  useEffect(() => {
    loadAndCompute();
  }, [rangeDays]);

  async function loadAndCompute() {
    setLoading(true);
    if (!supabase) { setLoading(false); return; }

    // Date range
    let fromDate: string | null = null;
    if (rangeDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() - rangeDays);
      fromDate = d.toLocaleDateString("en-CA");
    }

    // Build queries — conditionally add .gte() for date filter
    let painQ = supabase.from("pain_entries").select("*");
    let actQ = supabase.from("activity_entries").select("*, activity_categories(name, sub_prompt_type)").eq("did_activity", true);
    let ptQ = supabase.from("pt_entries").select("*");
    let medQ = supabase.from("medication_entries").select("*");

    if (fromDate) {
      painQ = painQ.gte("entry_date", fromDate);
      actQ = actQ.gte("entry_date", fromDate);
      ptQ = ptQ.gte("entry_date", fromDate);
      medQ = medQ.gte("entry_date", fromDate);
    }

    const [painRes, actRes, catRes, ptRes, medRes] = await Promise.all([
      painQ.order("entry_date"),
      actQ,
      supabase.from("activity_categories").select("*").order("sort_order"),
      ptQ,
      medQ,
    ]);

    const painEntries = (painRes.data || []) as PainEntry[];
    const actEntries = (actRes.data || []) as ActivityEntry[];
    const categories = (catRes.data || []) as ActivityCategory[];
    const ptEntries = (ptRes.data || []) as PtEntry[];
    const medEntries = (medRes.data || []) as MedEntry[];

    const dailyPain = computeDailyPain(painEntries);
    const chartData = computePainOverTime(dailyPain);
    const summary = computeSummary(dailyPain, ptEntries);
    const { data: todData, insight: todInsight } = computeTimeOfDay(painEntries);
    const actCorrelations = computeActivityCorrelations(painEntries, actEntries, categories);
    const { correlation: sleepCorrelation, distribution: sleepDistribution } = computeSleepAndPain(painEntries);
    const ptInsights = computePtInsights(painEntries, ptEntries);
    const medInsights = computeMedInsights(painEntries, medEntries);

    setData({
      dailyPain, chartData, summary, todData, todInsight,
      actCorrelations, sleepCorrelation, sleepDistribution,
      ptInsights, medInsights,
    });
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="text-sm font-medium text-blue-600">&larr; Back</Link>
        <h1 className="text-xl font-bold text-gray-900">Trends</h1>
        <div className="w-12" />
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <TimeRangeSelector value={rangeDays} onChange={setRangeDays} />

        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading…</p>
        ) : !data ? (
          <p className="text-gray-400 text-center py-8">No data available</p>
        ) : (
          <>
            <SummaryHighlights data={data.summary} />
            <PainOverTimeChart data={data.chartData} rangeDays={rangeDays} />
            <PainByTimeOfDay data={data.todData} insight={data.todInsight} />
            <ActivityCorrelationsSection data={data.actCorrelations} />
            <SleepAndPain correlation={data.sleepCorrelation} distribution={data.sleepDistribution} />
            <PtMedicationInsightsSection pt={data.ptInsights} med={data.medInsights} />
          </>
        )}

        <div className="h-4" />
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface Category {
  id: string;
  name: string;
  sub_prompt_type: string;
  sub_prompt_label: string | null;
  is_builtin: boolean;
  sort_order: number;
}

interface ActivityEntry {
  id: string;
  category_id: string;
  did_activity: boolean;
  sub_value: string | null;
}

interface Props {
  date: string;
  /** Increment this from the parent to trigger a save */
  saveCounter: number;
}

export default function ActivityLog({ date, saveCounter }: Props) {
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [entries,       setEntries]       = useState<Record<string, ActivityEntry>>({});
  const [activities,    setActivities]    = useState<Record<string, { did: boolean; subValue: string }>>({});
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName,    setCustomName]    = useState("");
  const [customSubType, setCustomSubType] = useState<string>("none");
  const isFirstRender = useRef(true);

  useEffect(() => { loadData(); }, [date]);

  // Save when parent increments saveCounter (skip initial render)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    performSave();
  }, [saveCounter]);

  async function loadData() {
    const [catRes, entRes] = await Promise.all([
      supabase.from("activity_categories").select("*").order("sort_order"),
      supabase.from("activity_entries").select("*").eq("entry_date", date),
    ]);

    const cats = catRes.data || [];
    setCategories(cats);

    const entryMap: Record<string, ActivityEntry> = {};
    const actMap: Record<string, { did: boolean; subValue: string }> = {};

    for (const entry of entRes.data || []) {
      entryMap[entry.category_id] = entry;
      actMap[entry.category_id] = { did: entry.did_activity, subValue: entry.sub_value || "" };
    }
    for (const cat of cats) {
      if (!actMap[cat.id]) actMap[cat.id] = { did: false, subValue: "" };
    }

    setEntries(entryMap);
    setActivities(actMap);
  }

  async function performSave() {
    // Use the latest state from refs — capture via closure at call time
    setCategories((currentCats) => {
      setActivities((currentActs) => {
        setEntries((currentEntries) => {
          // Fire-and-forget: save all categories
          (async () => {
            for (const cat of currentCats) {
              const act = currentActs[cat.id];
              if (!act) continue;
              const payload = {
                category_id: cat.id,
                entry_date: date,
                did_activity: act.did,
                sub_value: act.did ? act.subValue || null : null,
              };
              const existing = currentEntries[cat.id];
              if (existing) {
                await supabase.from("activity_entries").update(payload).eq("id", existing.id);
              } else if (act.did) {
                // Only insert if the activity was actually done (avoid cluttering DB with false entries)
                await supabase.from("activity_entries").insert(payload);
              }
            }
            // Refresh entry map after save so future saves have correct IDs
            const { data } = await supabase.from("activity_entries").select("*").eq("entry_date", date);
            const newEntryMap: Record<string, ActivityEntry> = {};
            for (const entry of data || []) newEntryMap[entry.category_id] = entry;
            setEntries(newEntryMap);
          })();
          return currentEntries;
        });
        return currentActs;
      });
      return currentCats;
    });
  }

  function toggleActivity(catId: string) {
    setActivities((prev) => ({
      ...prev,
      [catId]: { ...prev[catId], did: !prev[catId]?.did, subValue: prev[catId]?.subValue || "" },
    }));
  }

  function setSubValue(catId: string, value: string) {
    setActivities((prev) => ({ ...prev, [catId]: { ...prev[catId], subValue: value } }));
  }

  async function addCustomCategory() {
    if (!customName.trim()) return;
    const maxSort = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);
    const subLabel =
      customSubType === "intensity" ? "Intensity level" : null;

    const { data: newCat } = await supabase.from("activity_categories").insert({
      name: customName.trim(),
      sub_prompt_type: customSubType,
      sub_prompt_label: subLabel,
      is_builtin: false,
      sort_order: maxSort + 1,
    }).select().single();

    if (newCat) {
      // Patch state directly — don't reload, so existing checkbox state is preserved
      setCategories((prev) => [...prev, newCat]);
      setActivities((prev) => ({ ...prev, [newCat.id]: { did: false, subValue: "" } }));
    }

    setCustomName("");
    setCustomSubType("none");
    setShowAddCustom(false);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">Activities Today</h2>

      {categories.map((cat) => {
        const act = activities[cat.id] || { did: false, subValue: "" };
        return (
          <div key={cat.id} className="rounded-lg border border-gray-200 p-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={act.did}
                onChange={() => toggleActivity(cat.id)}
                className="w-5 h-5 rounded"
              />
              <span className="font-medium text-gray-900">{cat.name}</span>
            </label>

            {act.did && cat.sub_prompt_type !== "none" && (
              <div className="mt-3 ml-8">
                <p className="text-sm text-gray-500 mb-2">{cat.sub_prompt_label}</p>
                {cat.sub_prompt_type === "boolean" && (
                  <div className="flex gap-2">
                    {["Yes", "No"].map((opt) => (
                      <button key={opt}
                        onClick={() => setSubValue(cat.id, opt.toLowerCase())}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          act.subValue === opt.toLowerCase()
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {cat.sub_prompt_type === "distance" && (
                  <input
                    type="number" step="0.1" placeholder="mi"
                    value={act.subValue}
                    onChange={(e) => setSubValue(cat.id, e.target.value)}
                    className="w-full p-2 border rounded-lg text-gray-900"
                  />
                )}
                {cat.sub_prompt_type === "intensity" && (
                  <div className="flex gap-2">
                    {["light", "medium", "heavy"].map((level) => (
                      <button key={level}
                        onClick={() => setSubValue(cat.id, level)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                          act.subValue === level ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {showAddCustom ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-3 space-y-2">
          <input
            type="text" placeholder="Activity name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="w-full p-2 border rounded-lg text-gray-900"
          />
          <select
            value={customSubType}
            onChange={(e) => setCustomSubType(e.target.value)}
            className="w-full p-2 border rounded-lg text-gray-900"
          >
            <option value="none">No follow-up question</option>
            <option value="intensity">Intensity (light/medium/heavy)</option>
          </select>
          <div className="flex gap-2">
            <button onClick={addCustomCategory}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold">
              Add
            </button>
            <button onClick={() => setShowAddCustom(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddCustom(true)}
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 text-sm font-medium"
        >
          + Add custom activity
        </button>
      )}
    </div>
  );
}

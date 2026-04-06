"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface NotificationSettings {
  morning_time: string;
  afternoon_time: string;
  evening_time: string;
  bedtime_time: string;
  timezone: string;
  push_subscription: unknown;
}

interface Category {
  id: string;
  name: string;
  sub_prompt_type: string;
  is_builtin: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState<string>("unknown");

  useEffect(() => {
    loadSettings();
    loadCategories();
    checkPushStatus();
  }, []);

  async function loadSettings() {
    const { data } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (data) setSettings(data);
  }

  async function loadCategories() {
    const { data } = await supabase
      .from("activity_categories")
      .select("*")
      .order("sort_order");
    setCategories(data || []);
  }

  function checkPushStatus() {
    if (!("Notification" in window)) {
      setPushStatus("unsupported");
    } else if (Notification.permission === "granted") {
      setPushStatus("enabled");
    } else if (Notification.permission === "denied") {
      setPushStatus("denied");
    } else {
      setPushStatus("prompt");
    }
  }

  async function enableNotifications() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushStatus("denied");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidKey) {
      alert("VAPID public key not configured");
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    setPushStatus("enabled");
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);

    await supabase
      .from("notification_settings")
      .update({
        morning_time: settings.morning_time,
        afternoon_time: settings.afternoon_time,
        evening_time: settings.evening_time,
        bedtime_time: settings.bedtime_time,
        timezone: settings.timezone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    setSaving(false);
  }

  async function deleteCategory(id: string) {
    await supabase.from("activity_entries").delete().eq("category_id", id);
    await supabase.from("activity_categories").delete().eq("id", id);
    loadCategories();
  }

  function updateTime(field: keyof NotificationSettings, value: string) {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="text-sm font-medium text-blue-600">
          &larr; Back
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <div className="w-12" />
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* Notification Times */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Notification Times</h2>
          {[
            { label: "🌅 Morning",   field: "morning_time"   as const },
            { label: "☀️ Lunchtime", field: "afternoon_time" as const },
            { label: "🌤️ Evening",  field: "evening_time"   as const },
            { label: "🌙 Bedtime",  field: "bedtime_time"   as const },
          ].map(({ label, field }) => (
            <div
              key={field}
              className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200"
            >
              <span className="font-medium text-gray-900">{label}</span>
              <input
                type="time"
                value={settings[field] as string}
                onChange={(e) => updateTime(field, e.target.value)}
                className="text-gray-900 border rounded-lg px-2 py-1"
              />
            </div>
          ))}

          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full h-12 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Times"}
          </button>
        </section>

        {/* Push Notifications */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Push Notifications</h2>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            {pushStatus === "enabled" && (
              <p className="text-green-600 font-medium">Notifications enabled ✓</p>
            )}
            {pushStatus === "prompt" && (
              <button
                onClick={enableNotifications}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium"
              >
                Enable Notifications
              </button>
            )}
            {pushStatus === "denied" && (
              <p className="text-red-600 text-sm">
                Notifications blocked. Please enable them in your device settings.
              </p>
            )}
            {pushStatus === "unsupported" && (
              <p className="text-gray-500 text-sm">
                Push notifications require adding this app to your iPad Home Screen first.
              </p>
            )}
          </div>
        </section>

        {/* Custom Activities */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Activity Categories</h2>
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200"
            >
              <div>
                <span className="font-medium text-gray-900">{cat.name}</span>
                <span className="text-xs text-gray-400 ml-2">{cat.sub_prompt_type}</span>
              </div>
              {!cat.is_builtin && (
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="text-red-500 text-sm font-medium"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <p className="text-sm text-gray-500">
            Add custom activities from the main dashboard (bedtime screen).
          </p>
        </section>
      </main>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Supabase Edge Function: send-notification
// Called by pg_cron every minute. Checks if any notification is due and sends a web push.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_SUBJECT = "mailto:pain-tracker@example.com";

interface NotificationSettings {
  morning_time: string;
  afternoon_time: string;
  evening_time: string;
  bedtime_time: string;
  timezone: string;
  push_subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  } | null;
}

const PROMPTS: { field: keyof NotificationSettings; type: string; dbType: string; body: string }[] = [
  { field: "morning_time",   type: "morning",   dbType: "morning",   body: "Time for your morning check-in 🌅" },
  { field: "afternoon_time", type: "lunchtime", dbType: "afternoon", body: "Time for your lunchtime check-in ☀️" },
  { field: "evening_time",   type: "evening",   dbType: "evening",   body: "Time for your evening check-in 🌤️" },
  { field: "bedtime_time",   type: "bedtime",   dbType: "bedtime",   body: "Time for your bedtime check-in 🌙" },
];

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const isDev = url.searchParams.get("env") === "dev";
  const settingsTable  = isDev ? "dev_notification_settings" : "notification_settings";
  const entriesTable   = isDev ? "dev_pain_entries"          : "pain_entries";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: settings, error } = await supabase
    .from(settingsTable)
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !settings) {
    return new Response(JSON.stringify({ error: "Failed to load settings", detail: error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!settings.push_subscription) {
    return new Response(JSON.stringify({ skipped: "no push subscription stored" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get current time and date in user's timezone
  const now = new Date();
  const tz = settings.timezone || "Europe/London";
  const timeInTz = now.toLocaleTimeString("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const todayInTz = now.toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD

  const matched: string[] = [];
  const skipped: string[] = [];

  // Check each prompt time
  for (const prompt of PROMPTS) {
    const raw = settings[prompt.field] as string | undefined;
    if (!raw) continue;
    const scheduledTime = raw.slice(0, 5); // "HH:MM"
    if (timeInTz !== scheduledTime) continue;

    // Time matches — check if data already entered for this period today
    const { data: existing } = await supabase
      .from(entriesTable)
      .select("id")
      .eq("entry_date", todayInTz)
      .eq("prompt_type", prompt.dbType)
      .maybeSingle();

    if (existing) {
      skipped.push(prompt.type);
      continue;
    }

    await sendPush(settings.push_subscription, {
      title: "Pain Tracker",
      body: prompt.body,
      prompt: prompt.type,
    });
    matched.push(prompt.type);
  }

  return new Response(
    JSON.stringify({ ok: true, currentTime: timeInTz, matched, skipped, env: isDev ? "dev" : "prod" }),
    { headers: { "Content-Type": "application/json" } }
  );
});

async function sendPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; prompt: string }
) {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

  console.log("sendPush: endpoint =", subscription.endpoint.slice(0, 60) + "...");

  const { default: webpush } = await import("https://esm.sh/web-push@3.6.7");

  webpush.setVapidDetails(VAPID_SUBJECT, vapidPublicKey, vapidPrivateKey);

  try {
    const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log("sendPush: success, status =", result?.statusCode ?? result?.status ?? "unknown");
  } catch (err: any) {
    console.error("sendPush: error", err?.statusCode, err?.body ?? err?.message ?? err);
  }
}

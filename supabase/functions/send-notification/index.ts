// Supabase Edge Function: send-notification
// Called by pg_cron every minute. Checks if any notification is due and sends a web push.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_SUBJECT = "mailto:pain-tracker@example.com";

interface NotificationSettings {
  morning_time: string;
  midday_time: string;
  afternoon_time: string;
  evening_time: string;
  timezone: string;
  push_subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  } | null;
}

const PROMPTS: { field: keyof NotificationSettings; type: string; body: string }[] = [
  { field: "morning_time", type: "morning", body: "How was your pain last night?" },
  { field: "midday_time", type: "midday", body: "How is your pain now?" },
  { field: "afternoon_time", type: "afternoon", body: "How is your pain now?" },
  { field: "evening_time", type: "evening", body: "Time to log your evening pain and activities" },
];

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (!settings || !settings.push_subscription) {
    return new Response(JSON.stringify({ skipped: "no subscription" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get current time in user's timezone
  const now = new Date();
  const timeInTz = now.toLocaleTimeString("en-GB", {
    timeZone: settings.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Check each prompt time
  for (const prompt of PROMPTS) {
    const scheduledTime = (settings[prompt.field] as string).slice(0, 5); // "HH:MM"
    if (timeInTz === scheduledTime) {
      // Send push notification
      await sendPush(settings.push_subscription, {
        title: "Pain Tracker",
        body: prompt.body,
        prompt: prompt.type,
      });
      break;
    }
  }

  return new Response(JSON.stringify({ ok: true, checked: timeInTz }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function sendPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; prompt: string }
) {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

  // Import web-push compatible VAPID signing
  const { default: webpush } = await import("https://esm.sh/web-push@3.6.7");

  webpush.setVapidDetails(VAPID_SUBJECT, vapidPublicKey, vapidPrivateKey);

  await webpush.sendNotification(subscription, JSON.stringify(payload));
}

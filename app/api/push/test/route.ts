import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

webpush.setVapidDetails(
  "mailto:pain-tracker@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST() {
  const { data: settings } = await supabase
    .from("notification_settings")
    .select("push_subscription, timezone")
    .eq("id", 1)
    .single();

  if (!settings?.push_subscription) {
    return NextResponse.json(
      { error: "No push subscription stored. Open Settings and tap 'Re-register subscription'." },
      { status: 400 }
    );
  }

  try {
    await webpush.sendNotification(
      settings.push_subscription as webpush.PushSubscription,
      JSON.stringify({
        title: "Pain Tracker",
        body: "Test push ✓ — scheduled notifications should work.",
        prompt: "",
      })
    );
    return NextResponse.json({ ok: true, timezone: settings.timezone });
  } catch (err: any) {
    const statusCode = err.statusCode ?? err.status;
    const isGone = statusCode === 410 || statusCode === 404;
    return NextResponse.json(
      {
        error: isGone
          ? "Subscription is expired or invalid. Tap 'Re-register subscription' to fix."
          : (err.body || err.message || "Unknown error sending push"),
        statusCode,
      },
      { status: 500 }
    );
  }
}

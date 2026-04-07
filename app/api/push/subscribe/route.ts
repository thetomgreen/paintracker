import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {

  const subscription = await request.json();

  const { error } = await supabase
    .from("notification_settings")
    .update({
      push_subscription: subscription,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  VIEW_COOKIE_MAX_AGE,
  VIEW_COOKIE_NAME,
  VIEW_COOKIE_VALUE,
  VIEW_PASSCODE,
} from "@/lib/view-auth";

export async function signIn(formData: FormData) {
  const passcode = String(formData.get("passcode") ?? "");
  if (passcode !== VIEW_PASSCODE) {
    redirect("/view?error=wrong");
  }
  const store = await cookies();
  store.set(VIEW_COOKIE_NAME, VIEW_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: VIEW_COOKIE_MAX_AGE,
    path: "/",
  });
  redirect("/view/trends");
}

export async function signOut() {
  const store = await cookies();
  store.delete(VIEW_COOKIE_NAME);
  redirect("/view");
}

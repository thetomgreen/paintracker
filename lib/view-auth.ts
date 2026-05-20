import { cookies } from "next/headers";

export const VIEW_PASSCODE = "painfree";
export const VIEW_COOKIE_NAME = "view_auth";
export const VIEW_COOKIE_VALUE = "1";
export const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function isViewAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get(VIEW_COOKIE_NAME)?.value === VIEW_COOKIE_VALUE;
}

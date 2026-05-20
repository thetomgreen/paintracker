"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "@/app/view/actions";

export default function PasscodeGate() {
  const params = useSearchParams();
  const error = params.get("error") === "wrong";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Pain Tracker</h1>
          <p className="text-sm text-gray-500">Enter the passcode to view.</p>
        </div>
        <form action={signIn} className="space-y-3">
          <input
            type="password"
            name="passcode"
            autoFocus
            autoComplete="current-password"
            placeholder="Passcode"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
          {error && (
            <p className="text-sm text-red-600 text-center">Wrong passcode. Try again.</p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white font-medium active:bg-blue-700 transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

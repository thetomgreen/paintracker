"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/view/actions";

export default function ViewNav() {
  const pathname = usePathname();
  const isTrends = pathname === "/view/trends";
  const isHistory = pathname === "/view/history";

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active ? "bg-blue-600 text-white" : "text-gray-600 active:bg-gray-100"
    }`;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-gray-900">Pain Tracker</h1>
        <nav className="flex items-center gap-1">
          <Link href="/view/trends" className={tabClass(isTrends)}>
            Trends
          </Link>
          <Link href="/view/history" className={tabClass(isHistory)}>
            History
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-full text-sm text-gray-500 active:bg-gray-100 transition-colors"
              aria-label="Lock"
              title="Lock"
            >
              Lock
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}

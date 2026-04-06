import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest-dev.json",
};

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return children;
}

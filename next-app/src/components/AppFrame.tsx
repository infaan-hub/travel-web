"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";

/**
 * Application chrome. The onboarding flow is a standalone, full-screen
 * experience, so it renders without the sidebar and the top header (which
 * would otherwise duplicate the wordmark and subtract their height from the
 * 100dvh onboarding frame).
 */
export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = pathname === "/onboarding" || pathname === "/onboarding/";

  if (isBare) {
    return (
      <div id="main-content" className="app-bare">
        {children}
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-shell">
        <TopHeader />
        <main className="main-content" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

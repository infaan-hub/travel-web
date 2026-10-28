"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { useAuth } from "@/context/AuthContext";
import { usePwa } from "@/hooks/usePwa";
import { isOnboardingComplete } from "@/lib/onboarding";

/**
 * Application chrome. The onboarding flow is a standalone, full-screen
 * experience, so it renders without the sidebar and the top header (which
 * would otherwise duplicate the wordmark and subtract their height from the
 * 100dvh onboarding frame).
 */
export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { isAppLike } = usePwa();
  const isBare = pathname === "/onboarding" || pathname === "/onboarding/";

  useEffect(() => {
    if (pathname !== "/" || loading || isAuthenticated || isOnboardingComplete() || !isAppLike) return;
    router.replace("/onboarding/?from=%2F");
  }, [isAuthenticated, loading, pathname, router]);

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
<main className="main-content" id="main-content" style={isAppLike ? { paddingBottom: "calc(108px + env(safe-area-inset-bottom))" } : undefined}>
          {children}
        </main>
      </div>
    </div>
  );
}


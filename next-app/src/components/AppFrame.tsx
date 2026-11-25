"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/context/AuthContext";
import { usePwa } from "@/hooks/usePwa";
import {
  getPendingRoleOnboardingPath,
  isOnboardingRoute,
} from "@/lib/onboarding";

/**
 * Application chrome. Customer, Company, and Driver onboarding flows render as
 * full-screen standalone experiences without sidebar, top header, or bottom nav.
 * When launched inside an installed PWA (iPhone Add to Home Screen, Android
 * Install App, or Desktop PWA), first-time users are automatically guided into
 * their role's onboarding walkthrough.
 */
export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isStandalone, isAppLike, isReady } = usePwa();
  const isBare = isOnboardingRoute(pathname);

  useEffect(() => {
    if (!isReady || loading || !isStandalone) return;
    const redirectTarget = getPendingRoleOnboardingPath(
      user
        ? {
            id: user.id,
            is_staff: user.is_staff,
            account_type: user.account_type,
          }
        : null,
      {
        isInstalledApp: isStandalone,
        currentPath: pathname,
      },
    );
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [isReady, isStandalone, loading, pathname, router, user]);

  if (isBare) {
    return (
      <div id="main-content" className="app-bare">
        <div className="language-floating">
          <LanguageSwitcher />
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-shell">
        <TopHeader />
        <main
          className="main-content"
          id="main-content"
          style={
            isAppLike
              ? { paddingBottom: "calc(108px + env(safe-area-inset-bottom))" }
              : undefined
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}

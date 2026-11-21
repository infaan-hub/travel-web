"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import OnboardingExperience from "@/features/onboarding/OnboardingExperience";
import { CUSTOMER_ONBOARDING_SLIDES } from "@/features/onboarding/onboarding-slides";
import {
  loginPath,
  markCustomerOnboardingComplete,
  safeInternalPath,
} from "@/lib/onboarding";

export function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const fromPath = safeInternalPath(searchParams.get("from"));
  const nextMode = searchParams.get("next");

  const finishToApp = useCallback(() => {
    markCustomerOnboardingComplete();
    if (nextMode === "login") {
      router.replace(loginPath(fromPath));
      return;
    }
    router.replace(fromPath || "/");
  }, [fromPath, nextMode, router]);

  const finishToLogin = useCallback(() => {
    markCustomerOnboardingComplete();
    router.replace(loginPath(fromPath));
  }, [fromPath, router]);

  return (
    <OnboardingExperience
      role="customer"
      roleLabel="Traveler guide"
      slides={CUSTOMER_ONBOARDING_SLIDES}
      finishLabel={nextMode === "login" ? "Continue to sign in" : "Start exploring"}
      secondaryAction={
        !isAuthenticated && nextMode !== "login"
          ? {
              label: "Sign in",
              onClick: finishToLogin,
            }
          : undefined
      }
      onComplete={finishToApp}
      onSkip={finishToApp}
    />
  );
}

export default OnboardingFlow;

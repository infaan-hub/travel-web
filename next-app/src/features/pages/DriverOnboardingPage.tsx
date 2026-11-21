"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import OnboardingExperience from "@/features/onboarding/OnboardingExperience";
import { DRIVER_ONBOARDING_SLIDES } from "@/features/onboarding/onboarding-slides";
import { markDriverOnboardingComplete } from "@/lib/onboarding";

type DriverOnboardingPageProps = {
  driverName?: string;
};

export default function DriverOnboardingPage({
  driverName,
}: DriverOnboardingPageProps) {
  const router = useRouter();
  const { user } = useAuth();

  const finish = useCallback(() => {
    markDriverOnboardingComplete(user?.id);
    router.replace("/driver/dashboard/");
  }, [router, user?.id]);

  return (
    <OnboardingExperience
      role="driver"
      roleLabel={driverName ? `${driverName} · Driver guide` : "Driver workspace guide"}
      slides={DRIVER_ONBOARDING_SLIDES}
      finishLabel="Open driver dashboard"
      onComplete={finish}
      onSkip={finish}
    />
  );
}

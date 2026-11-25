"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import OnboardingExperience from "@/features/onboarding/OnboardingExperience";
import { COMPANY_ONBOARDING_SLIDES } from "@/features/onboarding/onboarding-slides";
import { markCompanyOnboardingComplete } from "@/lib/onboarding";

type CompanyOnboardingPageProps = {
  companyName?: string;
};

export default function CompanyOnboardingPage({
  companyName,
}: CompanyOnboardingPageProps) {
  const router = useRouter();
  const { user } = useAuth();

  const finish = useCallback(() => {
    markCompanyOnboardingComplete(user?.id);
    router.replace("/company/dashboard/");
  }, [router, user?.id]);

  return (
    <OnboardingExperience
      role="company"
      roleLabel={companyName ? `${companyName} · Setup guide` : "Company workspace guide"}
      slides={COMPANY_ONBOARDING_SLIDES}
      finishLabel="Open company dashboard"
      onComplete={finish}
      onSkip={finish}
    />
  );
}

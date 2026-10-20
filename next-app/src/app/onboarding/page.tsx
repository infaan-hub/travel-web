import type { Metadata } from "next";
import { OnboardingFlow } from "@/features/pages/OnboardingPage";

export const metadata: Metadata = {
  title: "Welcome to Travel.",
  description: "Start exploring the world with Travel.",
};

export default function Page() {
  return (
    <div className="onboarding-shell">
      <div className="onboarding-frame">
        <OnboardingFlow />
      </div>
    </div>
  );
}

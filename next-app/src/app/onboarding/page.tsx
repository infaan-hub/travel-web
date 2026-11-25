import { Suspense } from "react";
import type { Metadata } from "next";
import { OnboardingFlow } from "@/features/pages/OnboardingPage";

export const metadata: Metadata = {
  title: "Welcome to Travel.",
  description:
    "Learn how to request private hire trips, measure Zanzibar routes, reschedule bookings, and leave verified reviews.",
};

export default function OnboardingRoute() {
  return (
    <Suspense fallback={null}>
      <OnboardingFlow />
    </Suspense>
  );
}

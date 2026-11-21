import type { Metadata } from "next";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import DriverOnboardingPage from "@/features/pages/DriverOnboardingPage";

export const metadata: Metadata = {
  title: "Driver Onboarding",
  description:
    "Step-by-step walkthrough for confirming and completing live trips, managing route prices, sharing WhatsApp trips, reading insights, and registering your vehicle.",
};

export default async function DriverOnboardingRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  return <DriverOnboardingPage driverName={driver.name} />;
}

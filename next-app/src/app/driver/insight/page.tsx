import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import { loadDriverMonthlyInsightBundle } from "@/lib/services/driver-insight";
import DriverInsightPage from "@/features/pages/DriverInsightPage";

export const metadata: Metadata = {
  title: "Driver Work Insights",
  description: "Inspect monthly trip charts, graphs, work metrics, and export designed monthly PDF reports.",
};

export default async function DriverInsightRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  const bundle = await loadDriverMonthlyInsightBundle(driver.id);
  if (!bundle) notFound();

  return (
    <DriverInsightPage
      initialDriver={bundle.driver}
      initialInsights={bundle.insights}
    />
  );
}

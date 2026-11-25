import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import { getDriverFullContext } from "@/lib/services/driver-insight";
import DriverTripsHubPage from "@/features/pages/DriverTripsHubPage";

export const metadata: Metadata = {
  title: "Driver Trips — Generator & WhatsApp Dispatch",
  description: "Browse suggested and top-rated Zanzibar trips, generate routes, and send trip cards directly via WhatsApp.",
};

export default async function DriverTripsHubRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  const fullDriver = await getDriverFullContext(driver.id);
  if (!fullDriver) notFound();

  return <DriverTripsHubPage driver={fullDriver} />;
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import DriverTripStagePage from "@/features/pages/DriverTripStagePage";

export const metadata: Metadata = {
  title: "Start Trip — Navigate to Pickup",
  description: "Live GPS route from your current location to the booking pickup origin.",
};

export default async function DriverStartRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  return (
    <Suspense fallback={null}>
      <DriverTripStagePage
        pageStage="start"
        driverName={driver.name}
        companyName={driver.company?.name ?? "the public driver network"}
      />
    </Suspense>
  );
}

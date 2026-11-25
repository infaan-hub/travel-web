import { Suspense } from "react";
import type { Metadata } from "next";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import DriverTripStagePage from "@/features/pages/DriverTripStagePage";

export const metadata: Metadata = {
  title: "Live Trip — Origin to Destination",
  description: "Real-time road route tracking from origin to destination.",
};

export default async function DriverLiveTripRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  return (
    <Suspense fallback={null}>
      <DriverTripStagePage
        pageStage="trip"
        driverName={driver.name}
        companyName={driver.company?.name ?? "the public driver network"}
      />
    </Suspense>
  );
}

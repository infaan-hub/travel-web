import { Suspense } from "react";
import type { Metadata } from "next";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import DriverTripStagePage from "@/features/pages/DriverTripStagePage";

export const metadata: Metadata = {
  title: "Pickup Customer",
  description: "Verify full customer account details at the pickup location.",
};

export default async function DriverPickupRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  return (
    <Suspense fallback={null}>
      <DriverTripStagePage
        pageStage="pickup"
        driverName={driver.name}
        companyName={driver.company?.name ?? "the public driver network"}
      />
    </Suspense>
  );
}

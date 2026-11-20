import { Suspense } from "react";
import type { Metadata } from "next";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import DriverTripStagePage from "@/features/pages/DriverTripStagePage";

export const metadata: Metadata = {
  title: "Finalize Trip",
  description: "Review trip timeline and complete the journey.",
};

export default async function DriverFinalizeRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  return (
    <Suspense fallback={null}>
      <DriverTripStagePage
        pageStage="finalize"
        driverName={driver.name}
        companyName={driver.company?.name ?? "the public driver network"}
      />
    </Suspense>
  );
}

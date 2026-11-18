import type { Metadata } from "next";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import DriverTripsPage from "@/features/pages/DriverTripsPage";

export const metadata: Metadata = { title: "My trips" };

export default async function DriverTripsRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  return (
    <DriverTripsPage
      driverName={driver.name}
      isPublicDriver={driver.isPublic && !driver.company}
      companyName={driver.company?.name ?? "the public driver network"}
    />
  );
}

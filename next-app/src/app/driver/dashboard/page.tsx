import type { Metadata } from "next";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import DriverDashboardPage from "@/features/pages/DriverDashboardPage";

export const metadata: Metadata = {
  title: "Driver Dashboard",
  description: "Manage bookings, confirm trips, and run live GPS-tracked journeys.",
};

export default async function DriverDashboardRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  return (
    <DriverDashboardPage
      driverName={driver.name}
      companyName={driver.company?.name ?? "the public driver network"}
      isPublicDriver={driver.isPublic && !driver.company}
    />
  );
}

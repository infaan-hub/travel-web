import type { Metadata } from "next";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import DriverDashboardPage from "@/features/pages/DriverDashboardPage";

export const metadata: Metadata = { title: "Driver dashboard" };

export default async function DriverDashboardRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  return <DriverDashboardPage driverName={driver.name} companyName={driver.company?.name ?? "the public driver network"} />;
}

import type { Metadata } from "next";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import DriverBookingsPage from "@/features/pages/DriverBookingsPage";

export const metadata: Metadata = { title: "Driver Bookings" };

export default async function DriverTripsRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  return (
    <DriverBookingsPage
      driverName={driver.name}
      isPublicDriver={driver.isPublic && !driver.company}
      companyName={driver.company?.name ?? "the public driver network"}
    />
  );
}

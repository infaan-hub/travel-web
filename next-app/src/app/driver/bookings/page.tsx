import type { Metadata } from "next";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import DriverBookingsPage from "@/features/pages/DriverBookingsPage";

export const metadata: Metadata = {
  title: "Driver Bookings",
  description: "Confirm pending trips, notify customers and companies, and start live journeys.",
};

export default async function DriverBookingsRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  return (
    <DriverBookingsPage
      driverName={driver.name}
      isPublicDriver={driver.isPublic && !driver.company}
      companyName={driver.company?.name ?? "the public driver network"}
    />
  );
}

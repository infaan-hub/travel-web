import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import { loadDriverVehiclePortalData } from "@/lib/services/driver-vehicle";
import DriverVehiclePage from "@/features/pages/DriverVehiclePage";

export const metadata: Metadata = {
  title: "Driver Vehicle",
  description:
    "Manage your registered public hire vehicle or view your company-assigned private hire vehicle details.",
};

export default async function DriverVehicleRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  const data = await loadDriverVehiclePortalData(driver.id);
  if (!data) notFound();

  return <DriverVehiclePage initialData={data} />;
}

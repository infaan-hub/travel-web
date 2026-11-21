import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import { loadDriverPricesPortalData } from "@/lib/services/route-prices";
import DriverPricePage from "@/features/pages/DriverPricePage";

export const metadata: Metadata = {
  title: "Driver Prices",
  description:
    "View and manage Zanzibar private hire route prices in USD ($) and Tanzanian Shillings (TSh).",
};

export default async function DriverPriceRoute() {
  const { driver } = await requirePagePrivateHireDriver();
  const data = await loadDriverPricesPortalData(driver.id);
  if (!data) notFound();

  return <DriverPricePage initialData={data} />;
}

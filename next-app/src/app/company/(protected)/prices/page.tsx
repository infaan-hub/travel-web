import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import { loadCompanyPricesPortalData } from "@/lib/services/route-prices";
import CompanyPricesPage from "@/features/pages/CompanyPricesPage";

export const metadata: Metadata = {
  title: "Company Route Prices",
  description:
    "Manage Zanzibar One-way, Wait & return, and Full day Private charter prices for your company fleet.",
};

export default async function CompanyPricesRoute() {
  const { company } = await requirePageCompanyAccount();
  const data = await loadCompanyPricesPortalData(company.id);
  if (!data) notFound();

  return <CompanyPricesPage initialData={data} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import CompanyTourFormPage from "@/features/pages/CompanyTourFormPage";

export const metadata: Metadata = {
  title: "Edit tour",
};

export default async function CompanyTourEditRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageCompanyAccount({ permission: "tours:write" });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  return <CompanyTourFormPage tourId={id} />;
}

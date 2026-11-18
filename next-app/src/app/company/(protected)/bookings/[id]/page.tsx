import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import CompanyBookingDetailPage from "@/features/pages/CompanyBookingDetailPage";

export const metadata: Metadata = {
  title: "Booking detail",
};

export default async function CompanyBookingDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageCompanyAccount({ permission: "bookings:read" });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  return <CompanyBookingDetailPage bookingId={id} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageCompanyMember } from "@/lib/auth/company";
import CompanyBookingDetailPage from "@/features/pages/CompanyBookingDetailPage";

export const metadata: Metadata = {
  title: "Booking detail",
};

export default async function CompanyBookingDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageCompanyMember({ permission: "bookings:read" });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  return <CompanyBookingDetailPage bookingId={id} />;
}

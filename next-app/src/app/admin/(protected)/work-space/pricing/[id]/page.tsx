import type { Metadata } from "next";
import AdminPricingPage from "@/features/pages/AdminPricingPage";

export const metadata: Metadata = {
  title: 'Pricing',
};

export default function Page() {
  return <AdminPricingPage />;
}

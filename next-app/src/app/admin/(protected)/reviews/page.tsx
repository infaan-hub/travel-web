import type { Metadata } from "next";
import AdminReviewsPage from "@/features/pages/AdminReviewsPage";

export const metadata: Metadata = {
  title: 'Reviews',
};

export default function Page() {
  return <AdminReviewsPage />;
}

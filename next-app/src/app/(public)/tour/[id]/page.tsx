import type { Metadata } from "next";
import TourDetailPage from "@/features/pages/TourDetailPage";

export const metadata: Metadata = {
  title: 'Tour Details',
};

export default function Page() {
  return <TourDetailPage />;
}

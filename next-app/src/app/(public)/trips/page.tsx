import type { Metadata } from "next";
import TripsPage from "@/features/pages/TripsPage";

export const metadata: Metadata = {
  title: 'Trips',
};

export default function Page() {
  return <TripsPage />;
}

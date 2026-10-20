import type { Metadata } from "next";
import TripsPage from "@/features/pages/TripsPage";

export const metadata: Metadata = {
  title: 'Trips & Travel Tips',
};

export default function Page() {
  return <TripsPage />;
}

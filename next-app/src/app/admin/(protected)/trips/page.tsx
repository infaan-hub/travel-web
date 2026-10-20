import type { Metadata } from "next";
import AdminTripsPage from "@/features/pages/AdminTripsPage";

export const metadata: Metadata = {
  title: 'Manage Trips',
};

export default function Page() {
  return <AdminTripsPage />;
}

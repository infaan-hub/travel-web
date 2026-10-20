import type { Metadata } from "next";
import AdminBookingsPage from "@/features/pages/AdminBookingsPage";

export const metadata: Metadata = {
  title: 'Manage Bookings',
};

export default function Page() {
  return <AdminBookingsPage />;
}

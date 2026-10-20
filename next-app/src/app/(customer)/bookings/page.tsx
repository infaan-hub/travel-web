import type { Metadata } from "next";
import BookingsPage from "@/features/pages/BookingsPage";

export const metadata: Metadata = {
  title: 'My Bookings',
};

export default function Page() {
  return <BookingsPage />;
}

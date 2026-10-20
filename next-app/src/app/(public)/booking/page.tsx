import type { Metadata } from "next";
import BookingPage from "@/features/pages/BookingPage";

export const metadata: Metadata = {
  title: 'Book a Tour',
};

export default function Page() {
  return <BookingPage />;
}

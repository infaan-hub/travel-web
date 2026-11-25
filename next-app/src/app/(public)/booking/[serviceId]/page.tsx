import { Suspense } from "react";
import type { Metadata } from "next";
import BookingPage from "@/features/pages/BookingPage";

export const metadata: Metadata = {
  title: 'Request Private Hire',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BookingPage />
    </Suspense>
  );
}

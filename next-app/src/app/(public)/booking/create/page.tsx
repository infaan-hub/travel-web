import { Suspense } from "react";
import type { Metadata } from "next";
import BookingPage from "@/features/pages/BookingPage";

export const metadata: Metadata = {
  title: "Request Private Hire",
  description:
    "Request a private hire transport trip across Zanzibar with live route preview and instant driver matching.",
};

export default function CreatePublicBookingPage() {
  return (
    <Suspense fallback={null}>
      <BookingPage mode="public" />
    </Suspense>
  );
}

import type { Metadata } from "next";
import TripRequestPage from "@/features/pages/TripRequestPage";

export const metadata: Metadata = {
  title: "Request a Trip",
};

export default function Page() {
  return <TripRequestPage />;
}

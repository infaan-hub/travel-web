import type { Metadata } from "next";
import TransportServicesPage from "@/features/pages/TransportServicesPage";

export const metadata: Metadata = {
  title: "Private Hire Transport",
};

export default function Page() {
  return <TransportServicesPage />;
}

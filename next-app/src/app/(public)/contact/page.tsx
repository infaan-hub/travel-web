import type { Metadata } from "next";
import ContactPage from "@/features/pages/ContactPage";

export const metadata: Metadata = {
  title: "Contact & Partner Registration",
  description:
    "Contact Travel. support for booking or trip help, register your Zanzibar transport company fleet, or apply as a verified Public Hire Driver.",
};

export default function Page() {
  return <ContactPage />;
}

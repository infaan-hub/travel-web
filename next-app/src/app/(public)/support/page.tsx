import type { Metadata } from "next";
import ContactSupportPage from "@/features/pages/ContactSupportPage";

export const metadata: Metadata = {
  title: "General Support & Inquiries",
  description:
    "Message our Zanzibar support team for booking help, airport transfers, custom routes, or account questions.",
};

export default function Page() {
  return <ContactSupportPage />;
}

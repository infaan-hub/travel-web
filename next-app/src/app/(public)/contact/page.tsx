import type { Metadata } from "next";
import ContactPage from "@/features/pages/ContactPage";

export const metadata: Metadata = {
  title: 'Contact Us',
};

export default function Page() {
  return <ContactPage />;
}

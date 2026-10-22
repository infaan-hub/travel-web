import type { Metadata } from "next";
import ContactPage from "@/features/pages/ContactPage";

export const metadata: Metadata = {
  title: 'Contact Travel. platform support',
};

export default function Page() {
  return <ContactPage />;
}

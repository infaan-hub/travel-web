import type { Metadata } from "next";
import AdminMessagesPage from "@/features/pages/AdminMessagesPage";

export const metadata: Metadata = {
  title: 'Messages',
};

export default function Page() {
  return <AdminMessagesPage />;
}

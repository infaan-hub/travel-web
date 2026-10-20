import type { Metadata } from "next";
import AdminHomeEditorPage from "@/features/pages/AdminHomeEditorPage";

export const metadata: Metadata = {
  title: 'Home Editor',
};

export default function Page() {
  return <AdminHomeEditorPage />;
}

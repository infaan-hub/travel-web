import type { Metadata } from "next";
import AdminWorkSpacePage from "@/features/pages/AdminWorkSpacePage";

export const metadata: Metadata = {
  title: 'Workspace',
};

export default function Page() {
  return <AdminWorkSpacePage />;
}

import type { Metadata } from "next";
import ViewWorkspaceListPage from "@/features/pages/ViewWorkspaceListPage";

export const metadata: Metadata = {
  title: 'View Workspaces',
};

export default function Page() {
  return <ViewWorkspaceListPage />;
}

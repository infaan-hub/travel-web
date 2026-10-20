import type { Metadata } from "next";
import ViewWorkspacePage from "@/features/pages/ViewWorkspacePage";

export const metadata: Metadata = {
  title: 'View Workspace',
};

export default function Page() {
  return <ViewWorkspacePage />;
}

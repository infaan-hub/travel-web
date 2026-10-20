import { requirePageStaff } from "@/lib/auth/server-guard";

export default async function StaffWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageStaff();
  return children;
}

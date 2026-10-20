import { requirePageStaff } from "@/lib/auth/server-guard";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageStaff();
  return children;
}

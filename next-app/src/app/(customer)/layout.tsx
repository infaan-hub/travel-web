import { requirePageUser } from "@/lib/auth/server-guard";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return children;
}

import type { Metadata } from "next";
import { requirePageCompanyMember } from "@/lib/auth/company";

export const metadata: Metadata = {
  title: {
    default: "Company workspace",
    template: "%s | Company workspace",
  },
};

export default async function CompanyProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageCompanyMember();

  return <>{children}</>;
}

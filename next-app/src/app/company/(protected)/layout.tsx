import type { Metadata } from "next";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";

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
  await requirePageCompanyAccount();

  return <>{children}</>;
}

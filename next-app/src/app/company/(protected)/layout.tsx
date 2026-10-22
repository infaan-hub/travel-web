import type { Metadata } from "next";
import CompanyWorkspaceHeader from "@/components/CompanyWorkspaceHeader";
import { requirePageCompanyMember } from "@/lib/auth/company";
import { listActiveCompanyMemberships } from "@/lib/services/company-access";
import { publicImageUrl } from "@/lib/storage/images";

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
  const context = await requirePageCompanyMember();
  const memberships = await listActiveCompanyMemberships(context.user.id);
  const activeCompanies = memberships.filter(
    (membership) => membership.company.status === "ACTIVE",
  );

  return (
    <>
      <CompanyWorkspaceHeader
        companyName={context.company.name}
        companySlug={context.company.slug}
        role={context.role}
        permissions={context.permissions}
        logoUrl={publicImageUrl(context.company.logoImageKey)}
        canSwitch={activeCompanies.length > 1}
      />
      {children}
    </>
  );
}

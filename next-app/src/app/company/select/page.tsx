import { forbidden, redirect } from "next/navigation";
import { getCompanyPickerData } from "@/lib/auth/company";
import CompanySelectPage from "@/features/pages/CompanySelectPage";
import { publicImageUrl } from "@/lib/storage/images";

export default async function SelectCompanyPage() {
  const { memberships, selection } = await getCompanyPickerData();
  const available = memberships.filter(
    (membership) => membership.company.status === "ACTIVE",
  );

  if (available.length === 0) {
    if (memberships.length > 0) forbidden();
    redirect("/dashboard");
  }

  if (selection.reason === "ok") {
    redirect("/company/dashboard/");
  }

  return (
    <CompanySelectPage
      companies={available.map((membership) => ({
        id: membership.company.id,
        name: membership.company.name,
        slug: membership.company.slug,
        role: membership.role,
        description: membership.company.description,
        location: [
          membership.company.locality,
          membership.company.region,
          membership.company.country,
        ]
          .filter(Boolean)
          .join(", "),
        logoUrl: publicImageUrl(membership.company.logoImageKey),
      }))}
    />
  );
}

import { redirect } from "next/navigation";
import { Building2, Clock } from "@/components/icons";
import TourCompanyApplicationPage from "@/features/pages/TourCompanyApplicationPage";
import CompanyWorkspacePage from "@/features/pages/CompanyWorkspacePage";
import { requirePageCompanyMember, readActiveCompanySelector } from "@/lib/auth/company";
import { getServerUser } from "@/lib/auth/server-guard";
import { listActiveCompanyMemberships } from "@/lib/services/company-access";
import { getCompanyDashboard } from "@/lib/services/company-workspace";

export const dynamic = "force-dynamic";

export default async function TourCompanyDashboardRoute() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/api/token/refresh/?next=${encodeURIComponent("/tour-company/dashboard/")}`,
    );
  }
  if (user.accountType !== "TOUR_COMPANY") redirect("/");

  const memberships = await listActiveCompanyMemberships(user.id);
  const application = memberships[0];

  if (!application) return <TourCompanyApplicationPage />;

  if (application.company.status === "REJECTED") {
    return (
      <main className="page">
        <section className="admin-content">
          <h1><Building2 size={22} /> Company application not approved</h1>
          <p>
            The application for <strong>{application.company.name}</strong> was
            not approved. Contact the travel platform administrator for next
            steps.
          </p>
        </section>
      </main>
    );
  }

  if (!["ACTIVE", "PENDING"].includes(application.company.status)) {
    return (
      <main className="page">
        <section className="admin-content">
          <h1>Company workspace unavailable</h1>
          <p>This company account is currently {application.company.status.toLowerCase()}.</p>
        </section>
      </main>
    );
  }

  const selector = await readActiveCompanySelector();
  if (selector !== String(application.company.id)) {
    redirect(
      `/api/company/activate/?company_id=${application.company.id}&next=${encodeURIComponent("/tour-company/dashboard/")}`,
    );
  }
  const context = await requirePageCompanyMember({ permission: "dashboard:read" });
  const activeCompanies = memberships
    .filter((membership) => membership.company.status === "ACTIVE")
    .map((membership) => ({
      id: membership.company.id,
      name: membership.company.name,
      role: membership.role,
    }));
  const data = await getCompanyDashboard(context.company.id);

  return (
    <>
      {context.company.status === "PENDING" ? (
        <div className="page">
          <div className="alert" role="status">
            <Clock size={17} /> Your company application is awaiting administrator
            review. You can prepare tours while it is pending; tourists cannot
            see the company until it is approved.
          </div>
        </div>
      ) : null}
      <CompanyWorkspacePage
        context={context}
        companies={activeCompanies}
        data={data}
      />
    </>
  );
}

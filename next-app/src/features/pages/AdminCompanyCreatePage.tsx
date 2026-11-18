"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { companiesAPI } from "@/lib/api/client";
import { ArrowLeft, Building2 } from "@/components/icons";
import CompanyForm from "@/features/pages/CompanyForm";
import type { Company } from "@/features/pages/types";
import dashStyles from "@/features/pages/admin-dashboard.module.css";
import styles from "@/features/pages/admin-company-create.module.css";

export default function AdminCompanyCreatePage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !isAdmin) router.push("/login");
  }, [loading, isAuthenticated, isAdmin, router]);

  if (loading || !isAuthenticated || !isAdmin) {
    return (
      <div className={dashStyles.dashboardRoot}>
        <div className="loading">Checking access…</div>
      </div>
    );
  }

  return (
    <div className={dashStyles.dashboardRoot}>
      <header className={dashStyles.dashMasthead}>
        <div className={dashStyles.dashMastheadText}>
          <p className={dashStyles.dashEyebrow}>Admin workspace · Companies</p>
          <h1 className={dashStyles.dashTitle}><Building2 size={22} /> Create company and owner</h1>
          <p className={dashStyles.dashCopy}>
            Set up the owner’s sign-in credentials and company profile together. The company
            starts pending and private, assigned to this owner.
          </p>
        </div>
        <div className={dashStyles.dashActions}>
          <Link href="/admin/companies" className="btn btn-outline">
            <ArrowLeft size={16} /> Back to companies
          </Link>
        </div>
      </header>

      <section className={`${dashStyles.dashPanel} ${styles.companyCreate}`} aria-label="New company and owner">
        <div className={dashStyles.dashPanelHead}>
          <div className={dashStyles.dashPanelHeadMain}>
            <span className={dashStyles.dashPanelIcon} aria-hidden="true"><Building2 size={17} /></span>
            <div>
              <h2 className={dashStyles.dashPanelTitle}>Company profile and owner</h2>
              <p className={dashStyles.dashPanelCopy}>
                Create the owner account and enter the company’s identity details in one submission.
              </p>
            </div>
          </div>
        </div>
        <CompanyForm
          createWithOwner
          onCreate={(data) => companiesAPI.createWithOwner(data)}
          onSaved={(company: Company) => {
            router.push(`/admin/companies/${company.id}`);
          }}
        />
      </section>
    </div>
  );
}


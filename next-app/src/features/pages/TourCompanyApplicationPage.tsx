"use client";

import { useRouter } from "next/navigation";
import { companiesAPI } from "@/lib/api/client";
import { Building2 } from "@/components/icons";
import CompanyForm from "@/features/pages/CompanyForm";
import type { Company } from "@/features/pages/types";
import styles from "@/features/pages/admin-companies.module.css";

export default function TourCompanyApplicationPage() {
  const router = useRouter();

  return (
    <main className={`page admin-page ${styles.applicationPage}`}>
      <header className={styles.applicationHeader}>
        <p className={styles.eyebrow}>Tour Company workspace</p>
        <h1><Building2 size={24} /> Apply to list your company</h1>
        <p>
          Submit your company profile for review. Your profile and tours will
          become visible to tourists after an administrator approves it.
        </p>
      </header>
      <section className={`admin-content ${styles.applicationCard}`}>
        <CompanyForm
          onCreate={(data) => companiesAPI.createApplication(data)}
          onSaved={(_company: Company) => {
            router.replace("/tour-company/dashboard");
            router.refresh();
          }}
        />
      </section>
    </main>
  );
}

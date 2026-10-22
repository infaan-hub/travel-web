"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { companyAPI } from "@/lib/api/client";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { COMPANY_ROLE_LABELS } from "@/lib/company-access";
import type { CompanyRole } from "@prisma/client";
import styles from "@/features/pages/company-workspace.module.css";

export type CompanySwitcherOption = {
  id: number;
  name: string;
  role: CompanyRole;
};

export default function CompanySwitcher({
  companies,
  activeCompanyId,
}: {
  companies: CompanySwitcherOption[];
  activeCompanyId: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState(String(activeCompanyId));
  const [busy, setBusy] = useState(false);
  const { refreshUser } = useAuth();

  if (companies.length < 2) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const companyId = Number(selected);
    if (!Number.isInteger(companyId) || companyId === activeCompanyId) return;
    setBusy(true);
    try {
      await companyAPI.switchCompany(companyId);
      await refreshUser();
      router.push("/company/dashboard/");
      router.refresh();
    } catch {
      toast.error("That company workspace is not available.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={`glass-card ${styles.switcher}`} onSubmit={handleSubmit}>
      <div className={styles.switcherField}>
        <label className={styles.switcherLabel} htmlFor="company-switcher">
          Company workspace
        </label>
        <select
          className={styles.select}
          id="company-switcher"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          disabled={busy}
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name} — {COMPANY_ROLE_LABELS[company.role]}
            </option>
          ))}
        </select>
      </div>
      <button className={styles.button} type="submit" disabled={busy}>
        {busy ? "Switching…" : "Switch company"}
      </button>
    </form>
  );
}

"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CompanyRole } from "@prisma/client";
import { ArrowRight, Building2 } from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { companyAPI } from "@/lib/api/client";
import { COMPANY_ROLE_LABELS } from "@/lib/company-access";
import styles from "@/features/pages/company-workspace.module.css";

export type CompanyPickerOption = {
  id: number;
  name: string;
  slug: string;
  role: CompanyRole;
  description: string;
  location: string;
  logoUrl: string | null;
};

export default function CompanySelectPage({
  companies,
}: {
  companies: CompanyPickerOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const { refreshUser } = useAuth();
  const [busyId, setBusyId] = useState<number | null>(null);

  const selectCompany = async (companyId: number) => {
    setBusyId(companyId);
    try {
      await companyAPI.switchCompany(companyId);
      await refreshUser();
      router.push("/company/dashboard/");
      router.refresh();
    } catch {
      toast.error("That company workspace is not available.");
      setBusyId(null);
    }
  };

  return (
    <div className={`page ${styles.pickerPage}`}>
      <div className={styles.pickerIntro}>
        <p className={styles.eyebrow}>Company access</p>
        <h1 className={styles.pickerTitle}>Choose a company workspace</h1>
        <p className={styles.pickerCopy}>
          Your account belongs to more than one company. Choose the company you
          want to work in for this session. You can switch again from the
          company dashboard.
        </p>
      </div>

      <div className={styles.pickerGrid}>
        {companies.map((company) => (
          <div className={styles.pickerCard} key={company.id}>
            <button
              className={styles.pickerButton}
              type="button"
              onClick={() => void selectCompany(company.id)}
              disabled={busyId !== null}
              aria-label={`Open the ${company.name} workspace`}
            >
              <span className={styles.pickerCardTop}>
                {company.logoUrl ? (
                  <Image
                    className={styles.pickerLogo}
                    src={company.logoUrl}
                    alt=""
                    width={54}
                    height={54}
                  />
                ) : (
                  <span className={styles.pickerLogoFallback} aria-hidden="true">
                    <Building2 size={24} />
                  </span>
                )}
                <span>
                  <span className={styles.pickerName}>{company.name}</span>
                  <span className={styles.pickerMeta}>
                    {company.location || `@${company.slug}`}
                  </span>
                </span>
              </span>

              <span className={styles.pickerDescription}>
                {company.description ||
                  "This company workspace is ready for your team."}
              </span>

              <span className={styles.pickerFooter}>
                <span className={styles.pickerRole}>
                  {COMPANY_ROLE_LABELS[company.role]}
                </span>
                <span className={styles.pickerAction}>
                  {busyId === company.id ? "Opening…" : "Open workspace"}
                  <ArrowRight size={16} />
                </span>
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

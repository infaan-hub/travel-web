"use client";

import Link from "next/link";
import type { CompanyRole } from "@prisma/client";
import Image from "next/image";
import {
  Building2,
  Shield,
  Users,
} from "@/components/icons";
import type { CompanyPermission } from "@/lib/company-access";
import { COMPANY_ROLE_LABELS } from "@/lib/company-access";
import styles from "@/features/pages/company-operations.module.css";

export default function CompanyWorkspaceHeader({
  companyName,
  companySlug,
  role,
  logoUrl,
  canSwitch,
}: {
  companyName: string;
  companySlug: string;
  role: CompanyRole;
  permissions: readonly CompanyPermission[];
  logoUrl: string | null;
  canSwitch: boolean;
}) {
  return (
    <div className={styles.shellHeader}>
      <div className={styles.shellIdentity}>
        <span className={styles.shellLogo}>
          {logoUrl ? (
            <Image src={logoUrl} alt="" width={40} height={40} />
          ) : (
            <Building2 size={20} />
          )}
        </span>
        <div className={styles.shellIdentityText}>
          <span className={styles.shellEyebrow}>Company workspace</span>
          <strong className={styles.shellName}>{companyName}</strong>
          <span className={styles.shellMeta}>@{companySlug}</span>
        </div>
        <span className={styles.roleBadge}>
          <Shield size={13} />
          {COMPANY_ROLE_LABELS[role]}
        </span>
        {canSwitch ? (
          <Link className={styles.switchLink} href="/company/select/">
            <Users size={14} />
            Switch
          </Link>
        ) : null}
      </div>
    </div>
  );
}

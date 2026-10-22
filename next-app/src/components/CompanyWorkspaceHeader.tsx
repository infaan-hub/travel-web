"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CompanyRole } from "@prisma/client";
import Image from "next/image";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Globe,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
} from "@/components/icons";
import type { CompanyPermission } from "@/lib/company-access";
import { COMPANY_ROLE_LABELS } from "@/lib/company-access";
import styles from "@/features/pages/company-operations.module.css";

type HeaderLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: CompanyPermission;
  exact?: boolean;
};

const LINKS: HeaderLink[] = [
  {
    href: "/company/dashboard/",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "dashboard:read",
    exact: true,
  },
  {
    href: "/company/tours/",
    label: "Tours",
    icon: Globe,
    permission: "tours:read",
  },
  {
    href: "/company/bookings/",
    label: "Bookings",
    icon: ClipboardList,
    permission: "bookings:read",
  },
  {
    href: "/company/profile/",
    label: "Profile",
    icon: Building2,
    permission: "profile:read",
  },
  {
    href: "/company/analytics/",
    label: "Analytics",
    icon: BarChart3,
    permission: "analytics:read",
  },
];

export default function CompanyWorkspaceHeader({
  companyName,
  companySlug,
  role,
  permissions,
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
  const pathname = usePathname();
  const links = LINKS.filter((link) => permissions.includes(link.permission));

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

      <nav className={styles.shellNav} aria-label="Company workspace navigation">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.shellNavLink} ${active ? styles.shellNavLinkActive : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={16} />
              <span>{link.label}</span>
            </Link>
          );
        })}
        <span className={styles.shellNavHint}>
          <CalendarDays size={14} />
          Operations only
        </span>
        <Link className={styles.shellNavSettings} href="/settings" title="Account settings">
          <Settings size={16} />
          <span className="sr-only">Account settings</span>
        </Link>
      </nav>
    </div>
  );
}

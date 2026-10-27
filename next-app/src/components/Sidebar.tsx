"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AppIcon } from "@/components/icons";
import {
  Home,
  Globe,
  Palmtree,
  Map,
  ClipboardList,
  Mail,
  Lock,
  Settings,
  Users,
  LogOut,
  UserPlus,
  BookOpen,
  TrendingUp,
  LayoutDashboard,
  Image,
  Star,
  MessageSquare,
  Building2,
  X,
} from "@/components/icons";
import NextImage from "next/image";
import { useAuth } from "@/context/AuthContext";
import { profileAPI } from "@/lib/api/client";
import { COMPANY_ROLE_LABELS } from "@/lib/company-access";
import styles from "./sidebar.module.css";

type NavItem = {
  to: string;
  label: string;
  icon: AppIcon;
  exact?: boolean;
  permission?: string;
};

function NavIcon({ icon: Icon }: { icon: AppIcon }) {
  return <Icon size={20} />;
}

export default function Sidebar() {
  // The navigation is a closed drawer until the header's hamburger button opens
  // it. It never reserves space in the page shell and has no chevron toggle.
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileOpenRef = useRef(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // The mobile menu state is owned here, but the toggle button lives in the top
  // header. Both components stay in sync through a pair of window events:
  // `travel:toggle-nav` asks the sidebar to flip the menu, and
  // `travel:nav-state` broadcasts the resulting state back to the header.
  const applyMobileOpen = useCallback((next: boolean) => {
    mobileOpenRef.current = next;
    setMobileOpen(next);
    window.dispatchEvent(
      new CustomEvent("travel:nav-state", { detail: { open: next } }),
    );
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = () => {
      profileAPI
        .get()
        .then((response) => setProfileImage(response.data.profile_image || null))
        .catch(() => {});
    };
    load();
    window.addEventListener("profile-updated", load);
    return () => window.removeEventListener("profile-updated", load);
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    setProfileImage(null);
    applyMobileOpen(false);
    router.push("/login");
  };

  // The top header owns the mobile menu button, so the sidebar listens for it
  // and publishes its own state back so the header icon stays in sync.
  useEffect(() => {
    const toggle = () => {
      applyMobileOpen(!mobileOpenRef.current);
    };
    const close = () => {
      applyMobileOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("travel:toggle-nav", toggle);
    window.addEventListener("travel:close-nav", close);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("travel:toggle-nav", toggle);
      window.removeEventListener("travel:close-nav", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [applyMobileOpen]);

  const closeAll = () => {
    applyMobileOpen(false);
  };

  // Lock the page behind the drawer while it is open.
  useEffect(() => {
    document.body.classList.toggle("nav-drawer-open", mobileOpen);
    return () => document.body.classList.remove("nav-drawer-open");
  }, [mobileOpen]);

  const adminNavItems: NavItem[] = [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/home-editor", label: "Home Editor", icon: Image },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/companies", label: "Companies", icon: Building2 },
    { to: "/admin/tours", label: "Experiences", icon: Globe },
    { to: "/admin/bookings", label: "Bookings", icon: ClipboardList },

    { to: "/admin/reviews", label: "Reviews", icon: Star },
    { to: "/admin/messages", label: "Messages", icon: MessageSquare },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const customerNavItems: NavItem[] = [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/tours", label: "Experiences", icon: Globe, exact: true },
    { to: "/companies", label: "Companies", icon: Building2 },
    { to: "/trips", label: "Trip", icon: Map },
    { to: "/bookings", label: "Bookings", icon: ClipboardList },
    { to: "/contact", label: "Support", icon: Mail },
  ];

  const activeCompany = user?.companies?.find(
    (company) => company.id === user.active_company_id,
  ) ?? (user?.companies?.length === 1 ? user.companies[0] : null);
  const isTourCompany = user?.account_type === "TOUR_COMPANY";
  const companyPermissions = new Set(activeCompany?.permissions ?? []);
  const companyNavItems: NavItem[] = activeCompany
    ? [
        {
          to: "/company/dashboard/",
          label: "Company overview",
          icon: LayoutDashboard,
          exact: true,
          permission: "dashboard:read",
        },
        {
          to: "/company/tours/",
          label: "Experiences",
          icon: Globe,
          permission: "tours:read",
        },
        {
          to: "/company/trips/",
          label: "Trips",
          icon: Map,
          permission: "tours:read",
        },
        {
          to: "/company/bookings/",
          label: "Booking requests",
          icon: ClipboardList,
          permission: "bookings:read",
        },
        {
          to: "/company/profile/",
          label: "Company profile",
          icon: Building2,
          permission: "profile:read",
        },
        {
          to: "/company/analytics/",
          label: "Insights",
          icon: TrendingUp,
          permission: "analytics:read",
        },
      ].filter((item) => !item.permission || companyPermissions.has(item.permission))
    : [];

const profileHref = isAdmin
    ? "/admin/settings/"
    : isTourCompany
      ? "/company/profile/"
      : "/profile/";
  const navItems = isAdmin ? adminNavItems : isTourCompany ? [] : customerNavItems;
  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.to;
    return pathname === item.to || pathname.startsWith(item.to + "/");
  };

  const companySection = isTourCompany ? (
    <>
      {activeCompany ? (
        <>
          {companyNavItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              className={`${styles.item} ${isActive(item) ? styles.itemActive : ""}`}
              onClick={closeAll}
            >
              <span className={styles.icon}>
                <NavIcon icon={item.icon} />
              </span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          ))}
          {(user?.companies?.length ?? 0) > 1 && (
            <Link
              href="/company/select/"
              className={styles.item}
              onClick={closeAll}
            >
              <span className={styles.icon}>
                <NavIcon icon={Users} />
              </span>
              <span className={styles.label}>Switch company</span>
            </Link>
          )}
        </>
      ) : (
        <Link
          href={(user?.companies?.length ?? 0) > 1
            ? "/company/select/"
            : "/tour-company/dashboard"}
          className={styles.item}
          onClick={closeAll}
        >
          <span className={styles.icon}>
            <NavIcon icon={(user?.companies?.length ?? 0) > 1 ? Users : LayoutDashboard} />
          </span>
          <span className={styles.label}>
            {(user?.companies?.length ?? 0) > 1
              ? "Select company"
              : "Company application"}
          </span>
        </Link>
      )}
      <Link
        href="/settings/"
        className={`${styles.item} ${pathname === "/settings" ? styles.itemActive : ""}`}
        onClick={closeAll}
      >
        <span className={styles.icon}>
          <NavIcon icon={Settings} />
        </span>
        <span className={styles.label}>Account profile</span>
      </Link>
    </>
  ) : null;

  return (
    <>
      <aside
        className={`${styles.drawer} ${mobileOpen ? styles.open : ""}`}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div className={styles.header}>
          <Link href="/" className={styles.brand} onClick={closeAll}>
            <NextImage
              src="/travel.logo.jpeg"
              alt="Travel."
              width={150}
              height={52}
              style={{ height: 34, width: "auto", objectFit: "contain" }}
              priority
            />
          </Link>
          <button
            type="button"
            className={styles.close}
            onClick={closeAll}
            aria-label="Close navigation"
            title="Close navigation"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className={styles.nav} aria-label="Primary navigation">
          <div className={styles.sectionTitle}>
            {isAdmin
              ? "Platform workspace"
              : isTourCompany
                ? activeCompany
                  ? `Company (${COMPANY_ROLE_LABELS[activeCompany.role]})`
                  : "Company workspace"
                : "Discover"}
          </div>
          {!isAdmin && isTourCompany && companySection}
          {navItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              className={`${styles.item} ${isActive(item) ? styles.itemActive : ""}`}
              onClick={closeAll}
            >
              <span className={styles.icon}>
                <NavIcon icon={item.icon} />
              </span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.footer}>
          {isAuthenticated ? (
            <>
<Link href={profileHref} className={styles.userCard} onClick={closeAll}>
                <div className={styles.avatar}>
                  {profileImage ? (
                    <NextImage src={profileImage} alt="" width={42} height={42} className="avatar-img" />
                  ) : (
                    user?.username?.[0]?.toUpperCase() || "U"
                  )}
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user?.username}</span>
                  <span className={styles.userEmail}>{user?.email}</span>
                  <span className={styles.badges}>
                    {isAdmin && <span className={styles.badge}>Admin</span>}
                    {activeCompany && (
                      <span className={styles.badge}>
                        {COMPANY_ROLE_LABELS[activeCompany.role]}
                      </span>
                    )}
                  </span>
                </div>
              </Link>
              <button type="button" className={styles.logout} onClick={handleLogout} title="Signout">
                <LogOut size={16} />
                <span>Signout</span>
              </button>
            </>
          ) : (
            <div className={styles.accessActions}>
              <Link href="/login" className={`${styles.accessAction} ${styles.login}`} onClick={closeAll}>
                <Lock size={15} />
                <span>Signin</span>
              </Link>
              <Link href="/register" className={`${styles.accessAction} ${styles.register}`} onClick={closeAll}>
                <UserPlus size={15} />
                <span>Create account</span>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {mobileOpen && <div className={styles.overlay} onClick={closeAll} aria-hidden="true" />}
    </>
  );
}

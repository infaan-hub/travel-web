"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NextImage from "next/image";
import { Download } from "lucide-react";
import type { AppIcon } from "@/components/icons";
import {
  Briefcase,
  Building2,
  Car,
  ClipboardList,
  DollarSign,
  Home,
  Image,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Map,
  MessageSquare,
  Settings,
  Star,
  TrendingUp,
  User,
  UserPlus,
  Users,
  X,
} from "@/components/icons";
import { useAuth } from "@/context/AuthContext";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { profileAPI } from "@/lib/api/client";
import {
  getRoleHomeHref,
  getRoleProfileHref,
  getRoleSectionTitle,
  getSidebarNavItems,
  isNavItemActive,
  resolveNavRole,
  type NavIconKey,
} from "@/lib/navigation";
import { getImageUrl, isUnoptimizableImage } from "@/lib/utils/image-url";
import styles from "./sidebar.module.css";

const ICON_MAP: Record<NavIconKey, AppIcon> = {
  home: Home,
  dashboard: LayoutDashboard,
  car: Car,
  building: Building2,
  map: Map,
  bookings: ClipboardList,
  user: User,
  users: Users,
  briefcase: Briefcase,
  dollar: DollarSign,
  trending: TrendingUp,
  mail: Mail,
  lock: Lock,
  settings: Settings,
  image: Image,
  star: Star,
  message: MessageSquare,
};

function NavIcon({ iconKey }: { iconKey: NavIconKey }) {
  const Icon = ICON_MAP[iconKey];
  return <Icon size={20} aria-hidden="true" />;
}

export default function Sidebar() {
  // The navigation is a closed drawer until the header's hamburger button opens
  // it. It never reserves space in the page shell and has no chevron toggle.
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileOpenRef = useRef(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { showWebInstallUI, installing, triggerInstall } = usePwaInstall();
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
    router.push("/login/");
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
      if (event.key === "Escape") applyMobileOpen(false);
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

  const closeAll = () => applyMobileOpen(false);

  useEffect(() => {
    document.body.classList.toggle("nav-drawer-open", mobileOpen);
    return () => document.body.classList.remove("nav-drawer-open");
  }, [mobileOpen]);

  const role = resolveNavRole(user);
  const activeCompany = user?.company ?? null;
  const homeHref = getRoleHomeHref(user);
  const profileHref = getRoleProfileHref(user);
  const sectionTitle = getRoleSectionTitle(user);
  const navItems = getSidebarNavItems(user);
  const resolvedAvatar = profileImage ? getImageUrl(profileImage) : null;

  return (
    <>
      <aside
        className={`${styles.drawer} ${mobileOpen ? styles.open : ""}`}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div className={styles.header}>
          <Link href={homeHref} className={styles.brand} onClick={closeAll}>
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
          <div className={styles.sectionTitle}>{sectionTitle}</div>

          {role === "company" && !activeCompany ? (
            <span className={styles.item}>Company account is not assigned</span>
          ) : null}

          {navItems.map((item) => {
            const active = isNavItemActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.item} ${active ? styles.itemActive : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={closeAll}
              >
                <span className={styles.icon}>
                  <NavIcon iconKey={item.icon} />
                </span>
                <span className={styles.label}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          {isAuthenticated ? (
            <>
              <Link href={profileHref} className={styles.userCard} onClick={closeAll}>
                <div className={styles.avatar}>
                  {resolvedAvatar ? (
                    <NextImage
                      src={resolvedAvatar}
                      alt=""
                      width={42}
                      height={42}
                      className="avatar-img"
                      unoptimized={isUnoptimizableImage(resolvedAvatar)}
                    />
                  ) : (
                    user?.username?.[0]?.toUpperCase() || "U"
                  )}
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user?.username}</span>
                  <span className={styles.userEmail}>{user?.email}</span>
                  <span className={styles.badges}>
                    {isAdmin ? <span className={styles.badge}>Admin</span> : null}
                    {role === "company" && activeCompany ? (
                      <span className={styles.badge}>Company account</span>
                    ) : null}
                    {role === "driver" ? <span className={styles.badge}>Driver</span> : null}
                  </span>
                </div>
              </Link>
              <button
                type="button"
                className={styles.logout}
                onClick={handleLogout}
                title="Signout"
              >
                <LogOut size={16} />
                <span>Signout</span>
              </button>
            </>
          ) : (
            <div className={styles.accessActions}>
              <Link
                href="/login/"
                className={`${styles.accessAction} ${styles.login}`}
                onClick={closeAll}
              >
                <Lock size={15} />
                <span>Signin</span>
              </Link>
              <Link
                href="/register/"
                className={`${styles.accessAction} ${styles.register}`}
                onClick={closeAll}
              >
                <UserPlus size={15} />
                <span>Create account</span>
              </Link>
            </div>
          )}

          {showWebInstallUI ? (
            <button
              type="button"
              className={styles.downloadApp}
              disabled={installing}
              onClick={() => {
                closeAll();
                void triggerInstall();
              }}
            >
              <Download size={16} aria-hidden="true" />
              <span>{installing ? "Installing…" : "Download app"}</span>
            </button>
          ) : null}
        </div>
      </aside>

      {mobileOpen && <div className={styles.overlay} onClick={closeAll} aria-hidden="true" />}
    </>
  );
}

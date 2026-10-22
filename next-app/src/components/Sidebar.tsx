"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AppIcon } from "@/components/icons";
import {
  Home,
  Globe,
  Palmtree,
  Compass,
  Map,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Mail,
  Lock,
  Settings,
  Users,
  LogOut,
  UserPlus,
  BookOpen,
  TrendingUp,
  Eye,
  LayoutDashboard,
  Image,
  Star,
  MessageSquare,
  ChevronLeft,
  Truck,
  Briefcase,
  Building2,
} from "@/components/icons";
import NextImage from "next/image";
import { useAuth } from "@/context/AuthContext";
import { profileAPI } from "@/lib/api/client";
import { COMPANY_ROLE_LABELS } from "@/lib/company-access";

type NavItem = {
  to: string;
  label: string;
  icon: AppIcon;
  exact?: boolean;
  permission?: string;
};

function NavIcon({ icon: Icon }: { icon: AppIcon }) {
  return <Icon size={20} className="nav-svg-icon" />;
}

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileOpenRef = useRef(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // On phones the rail is an off-canvas drawer, so it always shows its labels;
  // on desktop the labels follow the expanded/collapsed rail state.
  const showLabels = expanded || mobileOpen;

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
    window.addEventListener("travel:toggle-nav", toggle);
    window.addEventListener("travel:close-nav", close);
    return () => {
      window.removeEventListener("travel:toggle-nav", toggle);
      window.removeEventListener("travel:close-nav", close);
    };
  }, [applyMobileOpen]);

  const closeAll = () => {
    applyMobileOpen(false);
  };

  const toggleRail = () => {
    if (mobileOpenRef.current) {
      closeAll();
      return;
    }
    setExpanded((value) => !value);
  };

  const adminNavItems: NavItem[] = [
    { to: "/admin/dashboard", label: "Platform overview", icon: LayoutDashboard, exact: true },
    { to: "/admin/home-editor", label: "Home Editor", icon: Image },
    { to: "/admin/customers", label: "Customers", icon: Users },
    { to: "/admin/companies", label: "Companies", icon: Building2 },
    { to: "/admin/tours", label: "Experiences", icon: Globe },
    { to: "/admin/trips", label: "Trips", icon: BookOpen },
    { to: "/admin/bookings", label: "Bookings", icon: ClipboardList },
    { to: "/admin/attractions", label: "Attractions", icon: Map },
    { to: "/admin/reviews", label: "Reviews", icon: Star },
    { to: "/admin/tips", label: "Tips", icon: BookOpen },
    { to: "/admin/analytics", label: "Analytics", icon: TrendingUp },
    { to: "/admin/travel", label: "Travel operations", icon: Truck },
    { to: "/admin/work-space", label: "Workspace", icon: Briefcase },
    { to: "/admin/messages", label: "Messages", icon: MessageSquare },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const customerNavItems: NavItem[] = [
    { to: "/", label: "Discover", icon: Home, exact: true },
    { to: "/tours", label: "Explore experiences", icon: Globe, exact: true },
    { to: "/companies", label: "Tourism companies", icon: Building2 },
    { to: "/tours/zanzibar", label: "Zanzibar", icon: Palmtree },
    { to: "/tours/tanzania", label: "Tanzania", icon: Compass },
    { to: "/attractions", label: "Places", icon: Map },
    { to: "/trips", label: "Trip planning", icon: BookOpen },
    ...(isAuthenticated
      ? [
          { to: "/dashboard", label: "My Travel", icon: BarChart3 } as NavItem,
          { to: "/booking", label: "New request", icon: CalendarDays } as NavItem,
          { to: "/bookings", label: "My requests", icon: ClipboardList } as NavItem,
          { to: "/settings", label: "Settings", icon: Settings } as NavItem,
        ]
      : []),
    { to: "/contact", label: "Contact", icon: Mail },
  ];

  const activeCompany = user?.companies?.find(
    (company) => company.id === user.active_company_id,
  ) ?? (user?.companies?.length === 1 ? user.companies[0] : null);
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

  const navItems = isAdmin ? adminNavItems : customerNavItems;
  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.to;
    return pathname === item.to || pathname.startsWith(item.to + "/");
  };

  const companySection = activeCompany ? (
    <>
      {showLabels && (
        <div className="nav-section-title">
          Company ({COMPANY_ROLE_LABELS[activeCompany.role]})
        </div>
      )}
      {companyNavItems.map((item) => (
        <Link
          key={item.to}
          href={item.to}
          className={`nav-item ${isActive(item) ? "active" : ""}`}
          onClick={closeAll}
        >
          <span className="nav-icon">
            <NavIcon icon={item.icon} />
          </span>
          {showLabels && <span className="nav-label">{item.label}</span>}
        </Link>
      ))}
      {showLabels && (user?.companies?.length ?? 0) > 1 && (
        <Link href="/company/select/" className="nav-item" onClick={closeAll}>
          <span className="nav-icon">
            <NavIcon icon={Users} />
          </span>
          <span className="nav-label">Switch company</span>
        </Link>
      )}
    </>
  ) : null;

  return (
    <>
      <aside
        className={`sidebar glass-sidebar ${expanded ? "expanded" : ""} ${mobileOpen ? "mobile-open" : ""}`}
      >
        <div className="sidebar-header">
          <Link href="/" className="sidebar-logo" onClick={closeAll}>
            <Palmtree size={24} className="logo-plane" />
            {showLabels && <span className="sidebar-wordmark">Travel<span>.</span></span>}
          </Link>
          <button
            type="button"
            className="collapse-btn"
            onClick={toggleRail}
            aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
            title={expanded ? "Collapse navigation" : "Expand navigation"}
          >
            <ChevronLeft
              size={16}
              style={{ transform: expanded ? undefined : "rotate(180deg)" }}
            />
          </button>
        </div>

        <nav className="sidebar-nav">
          {showLabels && <div className="nav-section-title">{isAdmin ? "Platform workspace" : "Discover"}</div>}
          {!isAdmin && companySection}
          {navItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              className={`nav-item ${isActive(item) ? "active" : ""}`}
              onClick={closeAll}
            >
              <span className="nav-icon">
                <NavIcon icon={item.icon} />
              </span>
              {showLabels && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}

          {isAdmin && companySection}
          {isAdmin && showLabels && (
            <>
              <div className="nav-section-title">Customer</div>
              {[
                { to: "/", label: "View Site", icon: Eye },
                { to: "/tours", label: "Browse Tours", icon: Globe },
              ].map((item) => (
                <Link
                  key={item.to}
                  href={item.to}
                  className={`nav-item ${pathname === item.to ? "active" : ""}`}
                  onClick={closeAll}
                >
                  <span className="nav-icon">
                    <NavIcon icon={item.icon} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {isAuthenticated ? (
            <>
              <div className="sidebar-user">
                <div className="user-avatar">
                  {profileImage ? (
                    <NextImage src={profileImage} alt="" width={38} height={38} className="avatar-img" />
                  ) : (
                    user?.username?.[0]?.toUpperCase() || "U"
                  )}
                </div>
                {showLabels && (
                  <div className="user-info">
                    <span className="user-name">{user?.username}</span>
                    <span className="user-email">{user?.email}</span>
                    <span className="user-badges">
                      {isAdmin && <span className="user-badge">Admin</span>}
                      {activeCompany && (
                        <span className="user-badge">
                          {COMPANY_ROLE_LABELS[activeCompany.role]}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              <button type="button" className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={16} />
                {showLabels && <span>Logout</span>}
              </button>
            </>
          ) : (
            <div className="auth-buttons">
              <Link href="/login" className="auth-btn login-btn" onClick={closeAll}>
                <Lock size={14} />
                {showLabels && <span>Login</span>}
              </Link>
              <Link href="/register" className="auth-btn register-btn" onClick={closeAll}>
                <UserPlus size={14} />
                {showLabels && <span>Register</span>}
              </Link>
            </div>
          )}
        </div>
      </aside>

      {mobileOpen && <div className="sidebar-overlay" onClick={closeAll} />}
    </>
  );
}

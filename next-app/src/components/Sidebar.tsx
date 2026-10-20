"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
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
  Menu,
  UserPlus,
  BookOpen,
  TrendingUp,
  Sparkles,
  Eye,
  LayoutDashboard,
  Image,
  Star,
  MessageSquare,
  ChevronLeft,
  Truck,
  Briefcase,
} from "lucide-react";
import NextImage from "next/image";
import { useAuth } from "@/context/AuthContext";
import { profileAPI } from "@/lib/api/client";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
    setExpanded(false);
    setMobileOpen(false);
    router.push("/login");
  };

  const closeAll = () => {
    setExpanded(false);
    setMobileOpen(false);
  };

  const adminNavItems: NavItem[] = [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/home-editor", label: "Home Editor", icon: Image },
    { to: "/admin/customers", label: "Customers", icon: Users },
    { to: "/admin/tours", label: "Manage Tours", icon: Globe },
    { to: "/admin/trips", label: "Trips", icon: BookOpen },
    { to: "/admin/bookings", label: "Bookings", icon: ClipboardList },
    { to: "/admin/attractions", label: "Attractions", icon: Map },
    { to: "/admin/reviews", label: "Reviews", icon: Star },
    { to: "/admin/tips", label: "Tips", icon: BookOpen },
    { to: "/admin/analytics", label: "Analytics", icon: TrendingUp },
    { to: "/admin/travel", label: "Manage Travel", icon: Truck },
    { to: "/admin/work-space", label: "Workspace", icon: Briefcase },
    { to: "/admin/messages", label: "Messages", icon: MessageSquare },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const customerNavItems: NavItem[] = [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/tours", label: "Browse Tours", icon: Globe, exact: true },
    { to: "/tours/zanzibar", label: "Zanzibar Tours", icon: Palmtree },
    { to: "/tours/tanzania", label: "Tanzania Safaris", icon: Compass },
    { to: "/attractions", label: "Attractions", icon: Map },
    { to: "/trips", label: "Trips", icon: BookOpen },
    { to: "/onboarding/", label: "Get started", icon: Sparkles },
    ...(isAuthenticated
      ? [
          { to: "/dashboard", label: "Dashboard", icon: BarChart3 } as NavItem,
          { to: "/booking", label: "Book a Tour", icon: CalendarDays } as NavItem,
          { to: "/bookings", label: "My Bookings", icon: ClipboardList } as NavItem,
          { to: "/settings", label: "Settings", icon: Settings } as NavItem,
        ]
      : []),
    { to: "/contact", label: "Contact", icon: Mail },
  ];

  const navItems = isAdmin ? adminNavItems : customerNavItems;
  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.to;
    return pathname === item.to || pathname.startsWith(item.to + "/");
  };

  const NavIcon = ({ icon: Icon }: { icon: LucideIcon }) => (
    <Icon size={20} className="nav-svg-icon" />
  );

  return (
    <>
      <button
        type="button"
        className="mobile-menu-btn"
        aria-label="Toggle navigation"
        onClick={() => {
          setExpanded(!expanded);
          setMobileOpen(!mobileOpen);
        }}
      >
        {expanded || mobileOpen ? (
          <ChevronLeft size={20} color="white" />
        ) : (
          <Menu size={20} color="white" />
        )}
      </button>

      <aside
        className={`sidebar glass-sidebar ${expanded ? "expanded" : ""} ${mobileOpen ? "mobile-open" : ""}`}
        onMouseEnter={() => {
          if (!mobileOpen) setExpanded(true);
        }}
        onMouseLeave={() => {
          if (!mobileOpen) setExpanded(false);
        }}
      >
        <div className="sidebar-header">
          <Link href="/" className="sidebar-logo" onClick={closeAll}>
            <Palmtree size={24} className="logo-plane" />
            {expanded && <span className="logo-text brand-wordmark">Travel.</span>}
          </Link>
          {expanded && (
            <button type="button" className="collapse-btn" onClick={closeAll}>
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
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
              {expanded && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}

          {isAdmin && expanded && (
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
                {expanded && (
                  <div className="user-info">
                    <span className="user-name">{user?.username}</span>
                    <span className="user-email">{user?.email}</span>
                    {isAdmin && <span className="user-badge">Admin</span>}
                  </div>
                )}
              </div>
              <button type="button" className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={16} />
                {expanded && <span>Logout</span>}
              </button>
            </>
          ) : (
            <div className="auth-buttons">
              <Link href="/login" className="auth-btn login-btn" onClick={closeAll}>
                <Lock size={14} />
                {expanded && <span>Login</span>}
              </Link>
              <Link href="/register" className="auth-btn register-btn" onClick={closeAll}>
                <UserPlus size={14} />
                {expanded && <span>Register</span>}
              </Link>
            </div>
          )}
        </div>
      </aside>

      {mobileOpen && <div className="sidebar-overlay" onClick={closeAll} />}
    </>
  );
}

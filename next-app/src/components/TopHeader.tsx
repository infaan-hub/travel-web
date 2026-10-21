"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Palmtree, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/tours", label: "Tours" },
  { to: "/attractions", label: "Attractions" },
  { to: "/trips", label: "Trips" },
  { to: "/contact", label: "Contact" },
];

/**
 * Sticky top header rendered on every page. It carries the Travel. wordmark,
 * the primary navigation and the account actions. On phones it collapses into a
 * single glass bar with a menu button that opens the slide-in sidebar.
 */
export default function TopHeader() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // The sidebar owns the mobile menu state. The header requests a toggle and
  // listens for the resulting state so the icon always matches the drawer.
  useEffect(() => {
    const sync = (event: Event) => {
      const open = (event as CustomEvent<{ open: boolean }>).detail?.open ?? false;
      setMenuOpen(open);
    };
    window.addEventListener("travel:nav-state", sync);
    return () => window.removeEventListener("travel:nav-state", sync);
  }, []);

  // A route change should always dismiss the mobile drawer.
  useEffect(() => {
    window.dispatchEvent(new Event("travel:close-nav"));
  }, [pathname]);

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <header className="top-header glass-header">
      <div className="top-header-inner">
        <button
          type="button"
          className="top-header-menu-btn"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => {
            // The sidebar is the source of truth; it replies with the new state.
            window.dispatchEvent(new Event("travel:toggle-nav"));
          }}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>

        <Link href="/" className="top-header-brand" aria-label="Travel. home">
          <span className="top-header-mark">
            <Palmtree size={20} aria-hidden="true" />
          </span>
          <span className="top-header-wordmark brand-wordmark">Travel.</span>
        </Link>

        <nav className="top-header-nav" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              href={link.to}
              className={`top-header-link ${isActive(link.to) ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="top-header-actions">
          {isAuthenticated ? (
            <Link href="/dashboard" className="top-header-avatar" title={user?.username ?? "Account"}>
              {(user?.username?.[0] ?? "T").toUpperCase()}
            </Link>
          ) : (
            <>
              <Link href="/login" className="top-header-link top-header-link-ghost">
                Login
              </Link>
              <Link href="/register" className="glass-button-primary top-header-cta">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
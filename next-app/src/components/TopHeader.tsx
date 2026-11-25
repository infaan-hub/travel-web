"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "@/components/icons";
import { useAuth } from "@/context/AuthContext";
import { getRoleHomeHref, resolveNavRole } from "@/lib/navigation";

export default function TopHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = resolveNavRole(user);
  const homeHref = getRoleHomeHref(user);
  const brandLabel =
    role === "admin"
      ? "Travel. admin dashboard"
      : role === "company"
        ? "Travel. company workspace"
        : role === "driver"
          ? "Travel. driver dashboard"
          : "Travel. home";

  useEffect(() => {
    const sync = (event: Event) => {
      const open = (event as CustomEvent<{ open: boolean }>).detail?.open ?? false;
      setMenuOpen(open);
    };
    window.addEventListener("travel:nav-state", sync);
    return () => window.removeEventListener("travel:nav-state", sync);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new Event("travel:close-nav"));
  }, [pathname]);

  return (
    <header className="top-header glass-header">
      <div className="top-header-inner">
        <button
          type="button"
          className="top-header-menu-btn"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => {
            window.dispatchEvent(new Event("travel:toggle-nav"));
          }}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>

        <Link href={homeHref} className="top-header-brand" aria-label={brandLabel}>
          <Image
            src="/travel.logo.jpeg"
            alt="Travel."
            width={40}
            height={40}
            style={{ height: 34, width: "auto", objectFit: "contain" }}
            priority
          />
          <span className="top-header-wordmark brand-wordmark">Travel.</span>
        </Link>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "@/components/icons";

export default function TopHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

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

        <Link href="/" className="top-header-brand" aria-label="Travel. home">
          <span className="top-header-wordmark brand-wordmark">Travel.</span>
        </Link>
      </div>
    </header>
  );
}

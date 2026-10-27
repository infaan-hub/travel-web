"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Palmtree, Map, ClipboardList, User } from "@/components/icons";
import { usePwa } from "@/hooks/usePwa";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tours", label: "Tours", icon: Palmtree },
  { href: "/trips", label: "Trips", icon: Map },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: User },
];

export default function PwaBottomNav() {
  const { isStandalone, isMobileOrTablet } = usePwa();
  const pathname = usePathname();

  if (!isStandalone || !isMobileOrTablet) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="pwa-bottom-nav" aria-label="App navigation">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`pwa-bottom-nav__item${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

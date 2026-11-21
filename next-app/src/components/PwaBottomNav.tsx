"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Building2,
  Car,
  ClipboardList,
  DollarSign,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  Lock,
  Mail,
  Map,
  MessageSquare,
  Settings,
  Star,
  TrendingUp,
  User,
  Users,
  type AppIcon,
} from "@/components/icons";
import { useAuth } from "@/context/AuthContext";
import { usePwa } from "@/hooks/usePwa";
import {
  getBottomNavItems,
  isNavItemActive,
  type NavIconKey,
} from "@/lib/navigation";
import { isOnboardingRoute } from "@/lib/onboarding";

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
  image: ImageIcon,
  star: Star,
  message: MessageSquare,
};

export default function PwaBottomNav() {
  const { isStandalone, isMobileOrTablet } = usePwa();
  const { user } = useAuth();
  const pathname = usePathname();

  if (!isStandalone || !isMobileOrTablet) return null;
  if (isOnboardingRoute(pathname)) return null;

  const items = getBottomNavItems(user);

  return (
    <nav className="pwa-bottom-nav" aria-label="App navigation">
      {items.map((item) => {
        const Icon = ICON_MAP[item.icon];
        const active = isNavItemActive(pathname, item);
        return (
          <Link
            key={`${item.href}-${item.label}`}
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

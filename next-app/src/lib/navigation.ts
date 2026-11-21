import type { AuthUser } from "@/context/AuthContext";

export type NavRole = "admin" | "company" | "driver" | "customer" | "guest";

export type NavIconKey =
  | "home"
  | "dashboard"
  | "car"
  | "building"
  | "map"
  | "bookings"
  | "user"
  | "users"
  | "briefcase"
  | "dollar"
  | "trending"
  | "mail"
  | "lock"
  | "settings"
  | "image"
  | "star"
  | "message";

export type RoleNavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
  exact?: boolean;
  matchPrefixes?: readonly string[];
  permission?: string;
};

export function normalizePathname(path: string | null | undefined): string {
  if (!path) return "/";
  const clean = path.split("?")[0]?.split("#")[0] || "/";
  if (clean === "/") return "/";
  return clean.replace(/\/+$/, "") || "/";
}

export function isNavItemActive(
  pathname: string | null | undefined,
  item: Pick<RoleNavItem, "href" | "exact" | "matchPrefixes">,
): boolean {
  const current = normalizePathname(pathname);
  const target = normalizePathname(item.href);

  if (item.exact || target === "/") {
    if (current === target) return true;
  } else if (current === target || current.startsWith(`${target}/`)) {
    return true;
  }

  if (item.matchPrefixes && item.matchPrefixes.length > 0) {
    return item.matchPrefixes.some((prefix) => {
      const normalized = normalizePathname(prefix);
      return current === normalized || current.startsWith(`${normalized}/`);
    });
  }

  return false;
}

export function resolveNavRole(user: AuthUser | null | undefined): NavRole {
  if (!user) return "guest";
  if (user.is_staff) return "admin";
  if (user.account_type === "TOUR_COMPANY" || user.account_type === "PRIVATE_HIRE_COMPANY") {
    return "company";
  }
  if (user.account_type === "DRIVER") return "driver";
  return "customer";
}

export function getRoleHomeHref(user: AuthUser | null | undefined): string {
  const role = resolveNavRole(user);
  switch (role) {
    case "admin":
      return "/admin/dashboard/";
    case "company":
      return user?.company ? "/company/dashboard/" : "/settings/";
    case "driver":
      return "/driver/dashboard/";
    case "customer":
    case "guest":
      return "/";
  }
}

export function getRoleProfileHref(user: AuthUser | null | undefined): string {
  const role = resolveNavRole(user);
  switch (role) {
    case "admin":
      return "/admin/settings/";
    case "company":
      return user?.company ? "/company/profile/" : "/settings/";
    case "driver":
    case "customer":
      return "/profile/";
    case "guest":
      return "/login/";
  }
}

export function getRoleSectionTitle(user: AuthUser | null | undefined): string {
  const role = resolveNavRole(user);
  switch (role) {
    case "admin":
      return "Platform workspace";
    case "company":
      return "Company workspace";
    case "driver":
      return "Driver workspace";
    case "customer":
    case "guest":
      return "Discover";
  }
}

export function getBottomNavItems(user: AuthUser | null | undefined): readonly RoleNavItem[] {
  const role = resolveNavRole(user);

  if (role === "admin") {
    return [
      {
        href: "/admin/dashboard/",
        label: "Dashboard",
        icon: "dashboard",
        exact: true,
      },
      {
        href: "/admin/companies/",
        label: "Companies",
        icon: "building",
        matchPrefixes: ["/admin/driver"],
      },
      {
        href: "/admin/bookings/",
        label: "Bookings",
        icon: "bookings",
      },
      {
        href: "/admin/users/",
        label: "Users",
        icon: "users",
        matchPrefixes: ["/admin/messages", "/admin/reviews"],
      },
      {
        href: "/admin/settings/",
        label: "Settings",
        icon: "settings",
        matchPrefixes: ["/admin/home-editor", "/admin/analytics"],
      },
    ];
  }

  if (role === "company") {
    if (user?.company) {
      return [
        {
          href: "/company/dashboard/",
          label: "Overview",
          icon: "dashboard",
          exact: true,
        },
        {
          href: "/company/private-hire/",
          label: "Fleet",
          icon: "car",
          matchPrefixes: ["/company/private-driver", "/company/private-service"],
        },
        {
          href: "/company/trips/",
          label: "Trips",
          icon: "map",
          matchPrefixes: ["/company/prices"],
        },
        {
          href: "/company/bookings/",
          label: "Bookings",
          icon: "bookings",
        },
        {
          href: "/company/profile/",
          label: "Profile",
          icon: "building",
          matchPrefixes: ["/company/analytics", "/settings"],
        },
      ];
    }

    return [
      { href: "/", label: "Home", icon: "home", exact: true },
      { href: "/companies/", label: "Companies", icon: "building", matchPrefixes: ["/company"] },
      {
        href: "/contact/",
        label: "Support",
        icon: "mail",
        matchPrefixes: ["/support", "/request"],
      },
      { href: "/settings/", label: "Settings", icon: "settings" },
      { href: "/profile/", label: "Profile", icon: "user" },
    ];
  }

  if (role === "driver") {
    return [
      {
        href: "/driver/dashboard/",
        label: "Overview",
        icon: "dashboard",
        exact: true,
      },
      {
        href: "/driver/bookings/",
        label: "Bookings",
        icon: "bookings",
      },
      {
        href: "/driver/trips/",
        label: "Trips",
        icon: "map",
        matchPrefixes: [
          "/driver/trip",
          "/driver/pickup",
          "/driver/start",
          "/driver/finalize",
          "/driver/dashboard/trips",
        ],
      },
      {
        href: "/driver/vehicle/",
        label: "Vehicle",
        icon: "car",
        matchPrefixes: ["/driver/price", "/driver/insight"],
      },
      {
        href: "/profile/",
        label: "Profile",
        icon: "user",
        matchPrefixes: ["/settings"],
      },
    ];
  }

  if (role === "customer") {
    return [
      { href: "/", label: "Home", icon: "home", exact: true },
      {
        href: "/transport/",
        label: "Services",
        icon: "car",
        matchPrefixes: ["/booking", "/private-hire", "/companies", "/company", "/drivers"],
      },
      { href: "/trips/", label: "Trips", icon: "map" },
      {
        href: "/bookings/",
        label: "Bookings",
        icon: "bookings",
        matchPrefixes: ["/my-transport"],
      },
      {
        href: "/profile/",
        label: "Profile",
        icon: "user",
        matchPrefixes: ["/settings"],
      },
    ];
  }

  // Guest (unauthenticated)
  return [
    { href: "/", label: "Home", icon: "home", exact: true },
    {
      href: "/transport/",
      label: "Services",
      icon: "car",
      matchPrefixes: ["/booking", "/private-hire"],
    },
    {
      href: "/companies/",
      label: "Companies",
      icon: "building",
      matchPrefixes: ["/company", "/drivers"],
    },
    {
      href: "/contact/",
      label: "Support",
      icon: "mail",
      matchPrefixes: ["/support", "/request"],
    },
    {
      href: "/login/",
      label: "Sign in",
      icon: "lock",
      matchPrefixes: ["/register", "/forgot-password", "/reset-password", "/verify-email"],
    },
  ];
}

const COMPANY_PERMISSIONS = new Set([
  "dashboard:read",
  "profile:read",
  "profile:update",
  "tours:read",
  "tours:write",
  "bookings:read",
  "bookings:update",
  "analytics:read",
]);

export function getSidebarNavItems(user: AuthUser | null | undefined): readonly RoleNavItem[] {
  const role = resolveNavRole(user);

  if (role === "admin") {
    return [
      { href: "/admin/dashboard/", label: "Dashboard", icon: "dashboard", exact: true },
      { href: "/admin/home-editor/", label: "Home Editor", icon: "image" },
      { href: "/admin/users/", label: "Users", icon: "users" },
      { href: "/admin/companies/", label: "Companies", icon: "building" },
      { href: "/admin/driver/", label: "Public Drivers", icon: "users" },
      { href: "/admin/bookings/", label: "Bookings", icon: "bookings" },
      { href: "/admin/reviews/", label: "Reviews", icon: "star" },
      { href: "/admin/messages/", label: "Messages", icon: "message" },
      { href: "/admin/settings/", label: "Settings", icon: "settings" },
    ];
  }

  if (role === "company") {
    if (!user?.company) {
      return [
        { href: "/settings/", label: "Account profile", icon: "settings" },
        {
          href: "/contact/",
          label: "Support",
          icon: "mail",
          matchPrefixes: ["/support", "/request"],
        },
      ];
    }

    const companyItems: RoleNavItem[] = [
      {
        href: "/company/dashboard/",
        label: "Company overview",
        icon: "dashboard",
        exact: true,
        permission: "dashboard:read",
      },
      { href: "/company/private-hire/", label: "Private Hire", icon: "car" },
      { href: "/company/private-driver/", label: "Private Drivers", icon: "user" },
      { href: "/company/private-service/", label: "Private Services", icon: "briefcase" },
      { href: "/company/trips/", label: "Trips", icon: "map", permission: "tours:read" },
      { href: "/company/prices/", label: "Prices", icon: "dollar" },
      {
        href: "/company/bookings/",
        label: "Booking requests",
        icon: "bookings",
        permission: "bookings:read",
      },
      {
        href: "/company/profile/",
        label: "Company profile",
        icon: "building",
        permission: "profile:read",
      },
      {
        href: "/company/analytics/",
        label: "Insights",
        icon: "trending",
        permission: "analytics:read",
      },
      { href: "/settings/", label: "Account profile", icon: "settings" },
    ];

    return companyItems.filter(
      (item) => !item.permission || COMPANY_PERMISSIONS.has(item.permission),
    );
  }

  if (role === "driver") {
    return [
      { href: "/driver/dashboard/", label: "Driver dashboard", icon: "dashboard", exact: true },
      { href: "/driver/bookings/", label: "Bookings", icon: "bookings" },
      {
        href: "/driver/trips/",
        label: "Trips",
        icon: "map",
        matchPrefixes: [
          "/driver/trip",
          "/driver/pickup",
          "/driver/start",
          "/driver/finalize",
          "/driver/dashboard/trips",
        ],
      },
      { href: "/driver/vehicle/", label: "Vehicle", icon: "car" },
      { href: "/driver/price/", label: "Price", icon: "dollar" },
      { href: "/driver/insight/", label: "Insight", icon: "trending" },
      { href: "/profile/", label: "Account profile", icon: "user", matchPrefixes: ["/settings"] },
    ];
  }

  if (role === "customer") {
    return [
      { href: "/", label: "Home", icon: "home", exact: true },
      {
        href: "/transport/",
        label: "Private hire",
        icon: "car",
        matchPrefixes: ["/booking", "/private-hire"],
      },
      {
        href: "/companies/",
        label: "Companies",
        icon: "building",
        matchPrefixes: ["/company"],
      },
      { href: "/trips/", label: "Trips", icon: "map" },
      {
        href: "/bookings/",
        label: "Bookings",
        icon: "bookings",
        matchPrefixes: ["/my-transport"],
      },
      {
        href: "/contact/",
        label: "Support",
        icon: "mail",
        matchPrefixes: ["/support", "/request"],
      },
    ];
  }

  // Guest (unauthenticated)
  return [
    { href: "/", label: "Home", icon: "home", exact: true },
    {
      href: "/transport/",
      label: "Private hire",
      icon: "car",
      matchPrefixes: ["/booking", "/private-hire"],
    },
    {
      href: "/companies/",
      label: "Companies",
      icon: "building",
      matchPrefixes: ["/company"],
    },
    { href: "/drivers/", label: "Drivers", icon: "users" },
    {
      href: "/contact/",
      label: "Support",
      icon: "mail",
      matchPrefixes: ["/support", "/request"],
    },
  ];
}

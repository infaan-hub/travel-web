"use client";

import Link from "next/link";
import {
  Building2,
  Car,
  ClipboardList,
  Compass,
  DollarSign,
  LayoutDashboard,
} from "lucide-react";
import { companyPricesAPI } from "@/lib/api/client";
import type {
  CompanyPricesPortalData,
  SerializedRoutePrice,
} from "@/lib/services/route-prices";
import RoutePricesManager from "@/features/pages/RoutePricesManager";
import ws from "@/features/pages/driver-workspace.module.css";

type Props = {
  initialData: CompanyPricesPortalData;
};

export default function CompanyPricesPage({ initialData }: Props) {
  return (
    <main id="company-prices-root" className={`page ${ws.page}`}>
      <div className={ws.shell}>
        <nav
          className={`${ws.topNav} ${ws.topNavHidePhone}`}
          aria-label="Company workspace navigation"
        >
          <div className={ws.topNavLinks}>
            <Link href="/company/dashboard/" className={ws.topNavLink}>
              <LayoutDashboard size={15} aria-hidden="true" />
              Overview
            </Link>
            <Link href="/company/private-hire/" className={ws.topNavLink}>
              <Car size={15} aria-hidden="true" />
              Fleet
            </Link>
            <Link href="/company/trips/" className={ws.topNavLink}>
              <Compass size={15} aria-hidden="true" />
              Trips
            </Link>
            <Link
              href="/company/prices/"
              className={`${ws.topNavLink} ${ws.topNavLinkActive}`}
              aria-current="page"
            >
              <DollarSign size={15} aria-hidden="true" />
              Prices
            </Link>
            <Link href="/company/bookings/" className={ws.topNavLink}>
              <ClipboardList size={15} aria-hidden="true" />
              Bookings
            </Link>
          </div>
        </nav>

        <header className={ws.heroCard}>
          <div className={ws.heroCopy}>
            <div className={ws.eyebrowRow}>
              <span className={ws.eyebrow}>
                <Building2 size={13} aria-hidden="true" />
                {initialData.company.name}
              </span>
            </div>
            <h1 className={ws.heroTitle}>Company Route Prices</h1>
            <p className={ws.heroLead}>
              Set, edit, or delete One-way, Wait &amp; return, and Full day Private charter prices
              in USD ($) and TSh. These rates are shown automatically to customers during booking
              and visible read-only to your company drivers.
            </p>
          </div>
        </header>

        <RoutePricesManager
          initialPrices={initialData.prices}
          canManage={true}
          onRefresh={async () => {
            const res = await companyPricesAPI.getAll();
            const payload = res.data as CompanyPricesPortalData;
            return payload.prices ?? [];
          }}
          onCreate={async (payload) => {
            const res = await companyPricesAPI.create(payload);
            return res.data as SerializedRoutePrice;
          }}
          onUpdate={async (id, payload) => {
            const res = await companyPricesAPI.update(id, payload);
            return res.data as SerializedRoutePrice;
          }}
          onDelete={async (id) => {
            await companyPricesAPI.delete(id);
          }}
          onResetDefaults={async () => {
            const res = await companyPricesAPI.resetDefaults();
            return (res.data?.prices ?? []) as SerializedRoutePrice[];
          }}
        />
      </div>
    </main>
  );
}

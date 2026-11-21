"use client";

import Link from "next/link";
import {
  BarChart3,
  Building2,
  Car,
  ClipboardList,
  Compass,
  DollarSign,
  LayoutDashboard,
  Lock,
} from "lucide-react";
import { driverAPI } from "@/lib/api/client";
import type {
  DriverPricesPortalData,
  SerializedRoutePrice,
} from "@/lib/services/route-prices";
import RoutePricesManager from "@/features/pages/RoutePricesManager";
import ws from "@/features/pages/driver-workspace.module.css";

type Props = {
  initialData: DriverPricesPortalData;
};

export default function DriverPricePage({ initialData }: Props) {
  const isPublicDriver = initialData.can_manage;
  const companyName = initialData.driver.company?.name || null;

  return (
    <main id="driver-workspace-root" className={`page ${ws.page}`}>
      <div className={ws.shell}>
        <nav className={ws.topNav} aria-label="Driver workspace navigation">
          <div className={ws.topNavLinks}>
            <Link href="/driver/dashboard/" className={ws.topNavLink}>
              <LayoutDashboard size={15} aria-hidden="true" />
              Dashboard
            </Link>
            <Link href="/driver/bookings/" className={ws.topNavLink}>
              <ClipboardList size={15} aria-hidden="true" />
              Bookings
            </Link>
            <Link href="/driver/trips/" className={ws.topNavLink}>
              <Compass size={15} aria-hidden="true" />
              Trips
            </Link>
            <Link href="/driver/vehicle/" className={ws.topNavLink}>
              <Car size={15} aria-hidden="true" />
              Vehicle
            </Link>
            <Link
              href="/driver/price/"
              className={`${ws.topNavLink} ${ws.topNavLinkActive}`}
              aria-current="page"
            >
              <DollarSign size={15} aria-hidden="true" />
              Price
            </Link>
            <Link href="/driver/insight/" className={ws.topNavLink}>
              <BarChart3 size={15} aria-hidden="true" />
              Insight
            </Link>
          </div>
        </nav>

        <header className={ws.heroCard}>
          <div className={ws.heroCopy}>
            <div className={ws.eyebrowRow}>
              <span className={ws.eyebrow}>
                {isPublicDriver ? (
                  <>
                    <DollarSign size={13} aria-hidden="true" />
                    Public Hire Driver
                  </>
                ) : (
                  <>
                    <Building2 size={13} aria-hidden="true" />
                    Private Hire Driver
                  </>
                )}
              </span>
              {!isPublicDriver ? (
                <span className={ws.eyebrow}>
                  <Lock size={12} aria-hidden="true" />
                  View Only
                </span>
              ) : null}
            </div>
            <h1 className={ws.heroTitle}>
              {isPublicDriver ? "My Route Prices" : "Company Route Prices"}
            </h1>
            <p className={ws.heroLead}>
              {isPublicDriver
                ? "View, add, edit, or delete One-way, Wait & return, and Full day Private charter prices across Zanzibar in USD ($) and Tanzanian Shillings (TSh)."
                : `View active One-way, Wait & return, and Full day Private charter prices set by ${
                    companyName || "your company"
                  }.`}
            </p>
          </div>
        </header>

        <RoutePricesManager
          initialPrices={initialData.prices}
          canManage={isPublicDriver}
          readOnlyNotice={
            companyName
              ? `View-only access: prices are set and managed by ${companyName} in /company/prices/.`
              : "View-only access: private hire company drivers cannot edit or delete prices."
          }
          onRefresh={async () => {
            const res = await driverAPI.getPrices();
            const payload = res.data as DriverPricesPortalData;
            return payload.prices ?? [];
          }}
          onCreate={
            isPublicDriver
              ? async (payload) => {
                  const res = await driverAPI.createPrice(payload);
                  return res.data as SerializedRoutePrice;
                }
              : undefined
          }
          onUpdate={
            isPublicDriver
              ? async (id, payload) => {
                  const res = await driverAPI.updatePrice(id, payload);
                  return res.data as SerializedRoutePrice;
                }
              : undefined
          }
          onDelete={
            isPublicDriver
              ? async (id) => {
                  await driverAPI.deletePrice(id);
                }
              : undefined
          }
          onResetDefaults={
            isPublicDriver
              ? async () => {
                  const res = await driverAPI.resetDefaultPrices();
                  return (res.data?.prices ?? []) as SerializedRoutePrice[];
                }
              : undefined
          }
        />
      </div>
    </main>
  );
}

"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from "next/image";
import { toursAPI, homeSettingsAPI, publicCompaniesAPI, publicPrivateHireAPI, publicDriversAPI } from '@/lib/api/client';
import { ArrowRight, Star, Car, Users, Briefcase, Compass, Navigation, Building2, CheckCircle, ChevronRight, MapPin } from '@/components/icons';
import { CalendarCheck2, ShieldCheck } from 'lucide-react';
import { getImageUrl } from '@/lib/utils/image-url';
import { readClientCache, writeClientCache } from '@/lib/cache/client-cache';

import BentoHero from "@/components/BentoHero";
import MoreExperiencesEmptyState from "@/components/MoreExperiencesEmptyState";
import styles from "@/features/pages/home-page.module.css";

import type { HomeSettings, Tour } from "@/features/pages/types";
import type { PublicDriverCard } from "@/lib/featured-drivers";
import { PRICING_LABELS, SAMPLE_PRIVATE_HIRE_SERVICES } from "@/features/transport/private-hire-data";

type FeaturedCompany = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_image_url: string | null;
  cover_image_url?: string | null;
  locality: string | null;
  district?: string | null;
  region: string | null;
  country?: string | null;
  public_path: string;
  services_count: number;
  trips_count: number;
  services?: Array<{
    id: number;
    vehicle?: { front_image_url?: string | null } | null;
  }>;
};

function HomePrivateHireFeaturedCard({ svc }: { svc: any }) {
  const [angleIndex, setAngleIndex] = useState(0);

  const vehicle = svc.vehicle ?? {};
  const vehicleName: string = vehicle.name ?? "Private vehicle";
  const plateNumber: string = vehicle.plate_number ?? vehicle.plateNumber ?? "";
  const category: string = vehicle.category ?? "";
  const companyName: string = svc.company?.name ?? "";
  const capacityPax = Number(vehicle.capacity ?? 0);
  const luggageBags = Number(vehicle.luggage_capacity ?? vehicle.luggageCapacity ?? 0);
  const pricingKey: string = svc.pricing_type ?? svc.pricingType ?? "per_trip";
  const pricingLabel = PRICING_LABELS[pricingKey] || pricingKey.replace(/_/g, " ");
  const priceAmount = Number(svc.price);
  const priceLabel = Number.isFinite(priceAmount)
    ? `$${Number.isInteger(priceAmount) ? priceAmount : priceAmount.toFixed(2)}`
    : `$${svc.price}`;
  const detailsHref = `/transport/service/${svc.id}/`;
  const description: string =
    (typeof svc.description === "string" && svc.description.trim()) ||
    (typeof vehicle.description === "string" && vehicle.description.trim()) ||
    "";

  const photos = [
    { label: "Front", url: vehicle.front_image_url || vehicle.frontImage || null },
    { label: "Side", url: vehicle.side_image_url || vehicle.sideImage || null },
    { label: "Back", url: vehicle.back_image_url || vehicle.backImage || null },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url));

  const activePhoto = photos[angleIndex] ?? photos[0] ?? null;

  return (
    <li className={styles.fpCard}>
      <div className={styles.fpMedia} aria-hidden="true">
        {activePhoto ? (
          <Image
            src={getImageUrl(activePhoto.url)}
            alt=""
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1100px) 48vw, 560px"
            className={styles.fpImage}
            unoptimized
          />
        ) : (
          <div className={styles.fpFallback}>
            <Car size={54} />
          </div>
        )}
      </div>
      <span className={styles.fpTopScrim} aria-hidden="true" />

      <div className={styles.fpTopBar}>
        <span className={styles.fpGlassBadge}>
          <ShieldCheck size={13} aria-hidden="true" />
          Verified private hire
        </span>

        <div className={styles.fpPriceBox}>
          <span className={styles.fpPriceValue}>{priceLabel}</span>
          <span className={styles.fpPriceUnit}>/ {pricingLabel}</span>
        </div>
      </div>

      <div className={styles.fpSheet}>
        <div className={styles.fpBodyRow}>
          <div className={styles.fpCopy}>
            <span className={styles.fpKicker}>
              {companyName
                ? `${companyName} · ${category || "Private Hire"}`
                : category || "Verified Private Hire"}
            </span>
            <h3 className={styles.fpTitle}>
              <Link href={detailsHref} className={styles.fpTitleLink}>
                {svc.title || vehicleName}
              </Link>
            </h3>
            {description ? <p className={styles.fpDesc}>{description}</p> : null}
          </div>

          {photos.length > 1 ? (
            <div className={styles.fpAnglePills} role="tablist" aria-label="Vehicle photo angle">
              {photos.map((photo, index) => (
                <button
                  key={photo.label}
                  type="button"
                  role="tab"
                  aria-selected={index === angleIndex}
                  className={`${styles.fpAngleBtn} ${
                    index === angleIndex ? styles.fpAngleBtnActive : ""
                  }`}
                  onClick={() => setAngleIndex(index)}
                >
                  {photo.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.fpBottomRow}>
          <ul className={styles.fpFacts} aria-label="Vehicle specifications">
            <li>
              <Car size={14} aria-hidden="true" />
              <span>{vehicleName}</span>
              {plateNumber ? <em>{plateNumber}</em> : null}
            </li>
            <li>
              <Users size={14} aria-hidden="true" />
              <span>{capacityPax} pax</span>
            </li>
            <li>
              <Briefcase size={14} aria-hidden="true" />
              <span>{luggageBags} bags</span>
            </li>
          </ul>

          <div className={styles.fpActionsRow}>
            <Link href={detailsHref} className={styles.fpGhostBtn}>
              Details
            </Link>
            <Link href={`/booking/${svc.id}/`} className={styles.fpPrimaryBtn}>
              <CalendarCheck2 size={16} aria-hidden="true" />
              Book This Service
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

function uniqueSampleServicesByCompany(limit = 4) {
  const seen = new Set<number>();
  const picked: typeof SAMPLE_PRIVATE_HIRE_SERVICES = [];
  for (const svc of SAMPLE_PRIVATE_HIRE_SERVICES) {
    const cid = svc.company?.id;
    if (cid != null) {
      if (seen.has(cid)) continue;
      seen.add(cid);
    }
    picked.push(svc);
    if (picked.length >= limit) break;
  }
  return picked;
}

function getCompanyInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "TP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatCompanyLocation(company: FeaturedCompany): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const value of [company.locality, company.district, company.region, company.country]) {
    const cleaned = value?.trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(cleaned);
    if (parts.length >= 2) break;
  }
  return parts.join(", ") || "Zanzibar, Tanzania";
}

export default function HomePage() {
  const [allTours, setAllTours] = useState<Tour[]>(() => readClientCache<Tour[]>("travel.homeTours") ?? []);
  const [homeSettings, setHomeSettings] = useState<HomeSettings | null>(() => readClientCache<HomeSettings>("travel.homeSettings"));
  const [companies, setCompanies] = useState<FeaturedCompany[]>(() => readClientCache<FeaturedCompany[]>("travel.homeCompanies") ?? []);
  const [topDrivers, setTopDrivers] = useState<PublicDriverCard[]>(() => readClientCache<PublicDriverCard[]>("travel.homeTopDrivers.v1") ?? []);
  const [privateServices, setPrivateServices] = useState<any[]>(() => readClientCache<any[]>("travel.homeFeaturedPrivateServices.v1") ?? []);
  const [livePrivateServices, setLivePrivateServices] = useState<any[]>(() => readClientCache<any[]>("travel.homeLivePrivateServices.v1") ?? []);
  const [loading, setLoading] = useState<boolean>(() => !(
    readClientCache<Tour[]>("travel.homeTours") ||
    readClientCache<HomeSettings>("travel.homeSettings") ||
    readClientCache<FeaturedCompany[]>("travel.homeCompanies")
  ));

  const companyServiceOptions = livePrivateServices.filter((svc) => svc && typeof svc.id === "number");

  // Cache hydration is handled by lazy state initializers above.

  useEffect(() => {
    publicPrivateHireAPI.getAll({ featured_home: "1", limit: 4 })
      .then((res) => {
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.results || [];
        if (list.length > 0) {
          setLivePrivateServices(list);
          writeClientCache("travel.homeLivePrivateServices.v1", list);
        }
        const services = list.length ? list.slice(0, 4) : uniqueSampleServicesByCompany(4);
        setPrivateServices(services);
        writeClientCache("travel.homeFeaturedPrivateServices.v1", services);
      })
      .catch(() => {
        setPrivateServices(uniqueSampleServicesByCompany(4));
      });
  }, []);

  useEffect(() => {
    void Promise.allSettled([
      toursAPI.getAll({}),
      homeSettingsAPI.get(),
      publicCompaniesAPI.getAll({ page: 1, page_size: 50 }),
      publicDriversAPI.getAll({ featured_home: "1", limit: 4 }),
    ]).then(([toursRes, homeRes, companiesRes, driversRes]) => {
      const readList = (value: unknown) => {
        if (Array.isArray(value)) return value;
        if (value && typeof value === "object" && "results" in value && Array.isArray(value.results)) return value.results;
        return [];
      };
      if (toursRes.status === "fulfilled") {
        const tours = readList(toursRes.value.data) as Tour[];
        setAllTours(tours);
        writeClientCache("travel.homeTours", tours);
      }
      else console.error(toursRes.reason);
      if (homeRes.status === "fulfilled") {
        const settings = homeRes.value.data as HomeSettings;
        setHomeSettings(settings);
        writeClientCache("travel.homeSettings", settings);
        try {
          window.localStorage.setItem("travel.homeSettings", JSON.stringify(settings));
        } catch {
          // Ignore storage failures and keep the in-memory settings.
        }
      }
      else console.error(homeRes.reason);
      if (companiesRes.status === "fulfilled") {
        const publicCompanyList = readList(companiesRes.value.data) as FeaturedCompany[];
        setCompanies(publicCompanyList.slice(0, 6));
        writeClientCache("travel.homeCompanies", publicCompanyList.slice(0, 6));
      } else {
        console.error(companiesRes.reason);
      }
      if (driversRes.status === "fulfilled") {
        const featuredDrivers = readList(driversRes.value.data) as PublicDriverCard[];
        setTopDrivers(featuredDrivers.slice(0, 4));
        writeClientCache("travel.homeTopDrivers.v1", featuredDrivers.slice(0, 4));
      } else {
        console.error(driversRes.reason);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="page-skeleton" aria-busy="true" aria-live="polite">
        <div className="page-skeleton__hero" />
        <div className="page-skeleton__grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="page-skeleton__card">
              <div className="page-skeleton__image" />
              <div className="page-skeleton__line page-skeleton__line--title" />
              <div className="page-skeleton__line" />
              <div className="page-skeleton__line page-skeleton__line--short" />
            </div>
          ))}
        </div>
        <style>{`
          .page-skeleton { padding: 24px; max-width: 1200px; margin: 0 auto; }
          .page-skeleton__hero { height: 260px; border-radius: 20px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: page-skeleton-shimmer 1.4s infinite; margin-bottom: 24px; }
          .page-skeleton__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
          .page-skeleton__card { padding: 12px; border-radius: 16px; background: #fff; box-shadow: 0 1px 3px rgba(15,23,42,.08); }
          .page-skeleton__image { height: 150px; border-radius: 12px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: page-skeleton-shimmer 1.4s infinite; margin-bottom: 12px; }
          .page-skeleton__line { height: 12px; border-radius: 999px; background: #e2e8f0; margin-bottom: 8px; }
          .page-skeleton__line--title { height: 16px; width: 70%; }
          .page-skeleton__line--short { width: 45%; }
          @keyframes page-skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`page home-page ${styles.homePageRoot}`}>
      <BentoHero
        mainImage={homeSettings?.hero_image_url}
        secondImage={homeSettings?.hero_secondary_image_url || homeSettings?.zanzibar_image_url}
        featuredImage={homeSettings?.hero_feature_image_url}
        thumbImage={homeSettings?.hero_thumb_image_url}
        featuredTour={allTours.find((tour) => tour.featured) || allTours[0] || null}
      />

      {(() => {
        const tripPublicBg = homeSettings?.trip_public_card_image_url
          ? getImageUrl(homeSettings.trip_public_card_image_url)
          : null;
        const tripCompanyBg = homeSettings?.trip_company_card_image_url
          ? getImageUrl(homeSettings.trip_company_card_image_url)
          : null;
        const companyHasBg = Boolean(tripCompanyBg);

        return (
          <section className={styles.tripsSection} aria-labelledby="home-trips-heading">
            <div className={styles.tripsHeader}>
              <div className={styles.tripsHeading}>
                <span className={styles.tripsEyebrow}>
                  <Compass size={14} aria-hidden="true" /> Trips
                </span>
                <h2 id="home-trips-heading" className={styles.tripsTitle}>
                  Request your private hire trip
                </h2>
              </div>
            </div>

            <div className={styles.tripsGrid}>
              {/* Card 1: Open Public Private Hire Request -> /booking/create/ */}
              <article
                className={`${styles.tripOptionCard} ${styles.tripOptionCardPublic} ${
                  tripPublicBg ? styles.tripOptionHasBg : ""
                }`}
              >
                {tripPublicBg ? (
                  <>
                    <Image
                      src={tripPublicBg}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 48vw, 460px"
                      className={styles.tripOptionBgImage}
                      unoptimized
                    />
                    <span className={styles.tripOptionBgScrim} aria-hidden="true" />
                  </>
                ) : null}

                <div className={styles.tripOptionContent}>
                  <div className={styles.tripOptionTop}>
                    <span className={styles.tripOptionIconLight} aria-hidden="true">
                      <Navigation size={18} />
                    </span>
                    <span className={styles.tripOptionBadgeLight}>Open private hire</span>
                  </div>

                  <div className={styles.tripOptionCopy}>
                    <h3 className={styles.tripOptionTitleLight}>Request Private hire Transport</h3>
                    <p className={styles.tripOptionDescLight}>
                      Set pickup, drop-off &amp; schedule — nearby drivers confirm your private hire
                      trip directly.
                    </p>
                  </div>

                  <div className={styles.tripOptionFooter}>
                    <Link href="/booking/create/" className={styles.tripActionLight}>
                      <span className={styles.tripActionLabelFull}>
                        Request Private hire Transport
                      </span>
                      <span className={styles.tripActionLabelShort}>Request now</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>

              {/* Card 2: Specific Company Private Hire Request -> /companies/ */}
              <article
                className={`${styles.tripOptionCard} ${
                  companyHasBg ? styles.tripOptionCardPublic : styles.tripOptionCardCompany
                } ${companyHasBg ? styles.tripOptionHasBg : ""}`}
              >
                {tripCompanyBg ? (
                  <>
                    <Image
                      src={tripCompanyBg}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 48vw, 460px"
                      className={styles.tripOptionBgImage}
                      unoptimized
                    />
                    <span className={styles.tripOptionBgScrim} aria-hidden="true" />
                  </>
                ) : null}

                <div className={styles.tripOptionContent}>
                  <div className={styles.tripOptionTop}>
                    <span
                      className={
                        companyHasBg ? styles.tripOptionIconLight : styles.tripOptionIconDark
                      }
                      aria-hidden="true"
                    >
                      <Building2 size={18} />
                    </span>
                    <span
                      className={
                        companyHasBg ? styles.tripOptionBadgeLight : styles.tripOptionBadgeDark
                      }
                    >
                      Specific company
                    </span>
                  </div>

                  <div className={styles.tripOptionCopy}>
                    <h3
                      className={
                        companyHasBg ? styles.tripOptionTitleLight : styles.tripOptionTitleDark
                      }
                    >
                      Request Private hire Transport by specific company
                    </h3>
                    <p
                      className={
                        companyHasBg ? styles.tripOptionDescLight : styles.tripOptionDescDark
                      }
                    >
                      Browse verified local companies, view all their private hire services, and
                      book directly.
                    </p>
                  </div>

                  <div className={styles.tripOptionFooter}>
                    <Link
                      href="/companies/"
                      className={companyHasBg ? styles.tripActionLight : styles.tripActionDark}
                    >
                      <span className={styles.tripActionLabelFull}>
                        Request by specific company
                      </span>
                      <span className={styles.tripActionLabelShort}>By company</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          </section>
        );
      })()}


      <section className={styles.hireSection} aria-labelledby="home-private-hire-heading">
        <div className={styles.hireHeader}>
          <div className={styles.hireHeading}>
            <span className={styles.hireEyebrow}>
              <Car size={14} aria-hidden="true" /> Private hire
            </span>
            <h2 id="home-private-hire-heading" className={styles.hireTitle}>
              Private hire for your journey
            </h2>
          </div>
          <Link href="/transport/" className={styles.hireBrowse}>
            Browse vehicles <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        {privateServices.length > 0 ? (
          <ul
            className={`${styles.fpGrid} ${
              privateServices.length === 1
                ? styles.fpGridSingle
                : privateServices.length === 2
                  ? styles.fpGridDouble
                  : ""
            }`}
          >
            {privateServices.slice(0, 4).map((svc) => (
              <HomePrivateHireFeaturedCard key={svc.id} svc={svc} />
            ))}
          </ul>
        ) : (
          <div className={styles.hireEmpty}>
            <Car size={26} aria-hidden="true" />
            <p>No private hire vehicles are listed right now.</p>
            <Link href="/transport/" className={styles.hireBtnPrimary}>
              Browse transport <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>


      {!loading && topDrivers.length > 0 && (
        <section className={styles.driversSection} aria-labelledby="home-drivers-heading">
          <div className={styles.driversHeader}>
            <div className={styles.driversHeading}>
              <span className={styles.driversEyebrow}>
                <Users size={14} aria-hidden="true" /> Drivers
              </span>
              <h2 id="home-drivers-heading" className={styles.driversTitle}>
                Top drivers
              </h2>
            </div>
            <Link href="/drivers/" className={styles.driversSeeMore}>
              See more <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <ul
            className={`${styles.fpGrid} ${styles.fpGridDrivers} ${
              topDrivers.length === 1
                ? styles.fpGridDriversSingle
                : topDrivers.length === 2
                  ? styles.fpGridDriversDouble
                  : topDrivers.length === 3
                    ? styles.fpGridDriversTriple
                    : ""
            }`}
          >
            {topDrivers.slice(0, 4).map((driver) => {
              const avatarUrl = driver.image_url ? getImageUrl(driver.image_url) : null;
              const vehicleImgUrl = driver.vehicle?.front_image_url
                ? getImageUrl(driver.vehicle.front_image_url)
                : null;
              const bgUrl = avatarUrl || vehicleImgUrl;
              const bookHref = driver.service_id
                ? `/booking/${driver.service_id}/`
                : "/booking/create/";
              const bookLabel = driver.service_id ? "Book This Driver" : "Request Trip";

              return (
                <li key={driver.id} className={`${styles.fpCard} ${styles.fpCardCompact}`}>
                  <div className={styles.fpMedia} aria-hidden="true">
                    {bgUrl ? (
                      <Image
                        src={bgUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 92vw, (max-width: 1180px) 46vw, 25vw"
                        className={`${styles.fpImage} ${avatarUrl ? styles.fpImagePortrait : ""}`}
                        unoptimized
                      />
                    ) : (
                      <div className={styles.fpFallback}>
                        <span className={styles.fpFallbackCircle}>
                          {getCompanyInitials(driver.name)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={styles.fpTopScrim} aria-hidden="true" />

                  <div className={styles.fpTopBar}>
                    <span className={styles.fpGlassBadge}>
                      <ShieldCheck size={13} aria-hidden="true" />
                      Verified driver
                    </span>

                    {driver.average_rating != null ? (
                      <span
                        className={styles.fpRatingPill}
                        aria-label={`Rated ${driver.average_rating.toFixed(1)} out of 5`}
                      >
                        <Star size={12} fill="#f59e0b" color="#f59e0b" aria-hidden="true" />
                        {driver.average_rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className={styles.fpRatingPill}>
                        {driver.trips_count > 0
                          ? `${driver.trips_count} ${driver.trips_count === 1 ? "trip" : "trips"}`
                          : "Available"}
                      </span>
                    )}
                  </div>

                  <div className={styles.fpSheet}>
                    <div className={styles.fpCopy}>
                      <span className={styles.fpKicker}>
                        {driver.company
                          ? `${driver.company.name} · Private Hire`
                          : "Public Hire Driver · Zanzibar"}
                      </span>
                      <h3 className={styles.fpTitle}>{driver.name}</h3>
                    </div>

                    <div className={styles.fpBottomRow}>
                      <ul className={styles.fpFacts} aria-label="Driver highlights">
                        {driver.vehicle ? (
                          <li>
                            <Car size={13} aria-hidden="true" />
                            <span>{driver.vehicle.name}</span>
                          </li>
                        ) : null}
                        {driver.vehicle && driver.vehicle.capacity > 0 ? (
                          <li>
                            <Users size={13} aria-hidden="true" />
                            <span>{driver.vehicle.capacity} pax</span>
                          </li>
                        ) : null}
                        {driver.trips_count > 0 ? (
                          <li>
                            <CheckCircle size={13} aria-hidden="true" />
                            <span>
                              {driver.trips_count} {driver.trips_count === 1 ? "trip" : "trips"}
                            </span>
                          </li>
                        ) : (
                          <li>
                            <Navigation size={13} aria-hidden="true" />
                            <span>Ready now</span>
                          </li>
                        )}
                      </ul>

                      <div className={styles.fpActionsRow}>
                        <Link href={bookHref} className={styles.fpPrimaryBtn}>
                          <CalendarCheck2 size={15} aria-hidden="true" />
                          {bookLabel}
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}


      {!loading && companies.length > 0 && (
        <section className={styles.providersSection} aria-labelledby="home-providers-heading">
          <div className={styles.providersHeader}>
            <div className={styles.providersHeading}>
              <span className={styles.providersEyebrow}>
                <Building2 size={14} aria-hidden="true" /> Meet the providers
              </span>
              <h2 id="home-providers-heading" className={styles.providersTitle}>
                Travel with people who know the place
              </h2>
            </div>
            <Link href="/companies/" className={styles.providersBrowse}>
              All companies <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <ul
            className={`${styles.fpGrid} ${styles.fpGridProviders} ${
              companies.length === 1
                ? styles.fpGridProvidersSingle
                : companies.length === 2
                  ? styles.fpGridProvidersDouble
                  : ""
            }`}
          >
            {companies.slice(0, 6).map((company) => {
              const directService =
                company.services?.[0] ??
                companyServiceOptions.find((svc) => svc.company?.id === company.id);
              const coverRaw =
                company.cover_image_url ||
                directService?.vehicle?.front_image_url ||
                null;
              const coverUrl = coverRaw ? getImageUrl(coverRaw) : null;
              const logoUrl = company.logo_image_url
                ? getImageUrl(company.logo_image_url)
                : null;
              const locationLabel = formatCompanyLocation(company);
              const description =
                company.description?.trim() ||
                "Licensed local transport partner offering verified private hire vehicles and experienced island drivers.";
              const servicesCount = Number(company.services_count ?? 0);
              const tripsCount = Number(company.trips_count ?? 0);

              return (
                <li key={company.id} className={styles.fpCard}>
                  <div className={styles.fpMedia} aria-hidden="true">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 92vw, (max-width: 1180px) 46vw, 33vw"
                        className={styles.fpImage}
                        unoptimized
                      />
                    ) : (
                      <div className={styles.fpFallback}>
                        <span className={styles.fpFallbackCircle}>
                          {getCompanyInitials(company.name)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={styles.fpTopScrim} aria-hidden="true" />

                  <div className={styles.fpTopBar}>
                    <div className={styles.fpTopLeft}>
                      <span className={styles.fpLogoBadge} aria-hidden="true">
                        {logoUrl ? (
                          <Image
                            src={logoUrl}
                            alt=""
                            fill
                            sizes="36px"
                            className={styles.fpLogoImg}
                            unoptimized
                          />
                        ) : (
                          getCompanyInitials(company.name)
                        )}
                      </span>
                      <span className={styles.fpGlassBadge}>
                        <ShieldCheck size={13} aria-hidden="true" />
                        Verified company
                      </span>
                    </div>

                    <span className={styles.fpRatingPill}>
                      <Car size={12} aria-hidden="true" />
                      {servicesCount > 0
                        ? `${servicesCount} ${servicesCount === 1 ? "vehicle" : "vehicles"}`
                        : "Private hire"}
                    </span>
                  </div>

                  <div className={styles.fpSheet}>
                    <div className={styles.fpCopy}>
                      <span className={styles.fpKicker}>{locationLabel} · Local Provider</span>
                      <h3 className={styles.fpTitle}>
                        <Link href={company.public_path} className={styles.fpTitleLink}>
                          {company.name}
                        </Link>
                      </h3>
                      <p className={styles.fpDesc}>{description}</p>
                    </div>

                    <div className={styles.fpBottomRow}>
                      <ul className={styles.fpFacts} aria-label="Company highlights">
                        <li>
                          <MapPin size={13} aria-hidden="true" />
                          <span>{locationLabel}</span>
                        </li>
                        <li>
                          <Car size={13} aria-hidden="true" />
                          <span>
                            {servicesCount > 0
                              ? `${servicesCount} ${servicesCount === 1 ? "service" : "services"}`
                              : "Private fleet"}
                          </span>
                        </li>
                        {tripsCount > 0 ? (
                          <li>
                            <Compass size={13} aria-hidden="true" />
                            <span>
                              {tripsCount} {tripsCount === 1 ? "trip" : "trips"}
                            </span>
                          </li>
                        ) : null}
                      </ul>

                      <div className={styles.fpActionsRow}>
                        {directService ? (
                          <>
                            <Link href={company.public_path} className={styles.fpGhostBtn}>
                              Company
                            </Link>
                            <Link
                              href={`/booking/${directService.id}/`}
                              className={styles.fpPrimaryBtn}
                            >
                              <CalendarCheck2 size={15} aria-hidden="true" />
                              Book This Service
                            </Link>
                          </>
                        ) : (
                          <Link href={company.public_path} className={styles.fpPrimaryBtn}>
                            Explore Company <ArrowRight size={15} aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}



      {!loading && (allTours.length === 0 || homeSettings?.more_experiences_image_urls?.some((image) => Boolean(image))) && (
        <MoreExperiencesEmptyState
          imageUrls={homeSettings?.more_experiences_image_urls?.slice(0, 5).map((image) => image ? getImageUrl(image) : null)}
        />
      )}
    </div>
  );
}

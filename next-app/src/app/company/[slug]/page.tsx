import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CalendarCheck2, ShieldCheck, UserCheck } from "lucide-react";
import { getPublicCompany } from "@/lib/services/public-companies";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Car,
  Clock,
  Compass,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Star,
  Users,
} from "@/components/icons";
import { getImageUrl } from "@/lib/utils/image-url";
import { openingHoursEntries } from "@/lib/company-opening-hours";
import styles from "@/features/pages/company-profile-page.module.css";

type Props = { params: Promise<{ slug: string }> };

function formatCompanyLocation(company: {
  locality?: string | null;
  district?: string | null;
  region?: string | null;
}): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const value of [company.locality, company.district, company.region]) {
    const cleaned = typeof value === "string" ? value.trim() : "";
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (key === "tanzania" || seen.has(key)) continue;
    seen.add(key);
    parts.push(cleaned);
    if (parts.length >= 2) break;
  }
  if (parts.length === 0) return "Zanzibar";
  if (!parts.some((p) => p.toLowerCase().includes("zanzibar"))) {
    parts.push("Zanzibar");
  }
  return parts.join(", ");
}

function companyInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word));
  if (words.length === 0) return "CO";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function safeExternalUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function safeTelHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  return cleaned.length >= 6 ? `tel:${cleaned}` : null;
}

function formatPrice(raw: unknown): string {
  const num = Number(raw);
  if (Number.isFinite(num)) {
    return `$${Number.isInteger(num) ? num.toLocaleString("en-US") : num.toFixed(2)}`;
  }
  return `$${String(raw ?? "0")}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = (await getPublicCompany(slug)) as any;
  if (!company) return { title: "Company not found" };
  return {
    title: `${company.name} | Zanzibar Local Provider`,
    description:
      company.description ||
      `Verified local private hire services operated by ${company.name} in Zanzibar.`,
  };
}

export default async function CompanyProfilePage({ params }: Props) {
  const { slug } = await params;
  const company = (await getPublicCompany(slug)) as any;
  if (!company) notFound();

  const services: any[] = Array.isArray(company.services) ? company.services : [];
  const trips: any[] = Array.isArray(company.trips) ? company.trips : [];
  const companyHours = openingHoursEntries(company.opening_hours);
  const locationLabel = formatCompanyLocation(company);

  const heroCoverRaw =
    company.cover_image_url ||
    services[0]?.vehicle?.front_image_url ||
    null;
  const heroCoverUrl = heroCoverRaw ? getImageUrl(heroCoverRaw) : null;
  const logoUrl = company.logo_image_url ? getImageUrl(company.logo_image_url) : null;
  const telHref = safeTelHref(company.contact_phone);
  const websiteUrl = safeExternalUrl(company.website);
  const mapUrl = safeExternalUrl(company.map_url);

  const uniqueDriversCount = new Set(
    services
      .map((svc) => svc?.driver?.name?.trim())
      .filter((name): name is string => Boolean(name)),
  ).size;

  const socialEntries: Array<{ label: string; href: string }> = [];
  if (company.social_links && typeof company.social_links === "object") {
    const labelMap: Record<string, string> = {
      instagram: "Instagram",
      facebook: "Facebook",
      x: "X",
      linkedin: "LinkedIn",
      youtube: "YouTube",
      tripadvisor: "Tripadvisor",
    };
    for (const [key, value] of Object.entries(company.social_links)) {
      const href = safeExternalUrl(value);
      if (href) {
        socialEntries.push({
          label: labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1),
          href,
        });
      }
    }
  }

  const descriptionText =
    company.description?.trim() ||
    "Verified local private hire and tourism operator in Zanzibar offering comfortable vehicles, experienced island drivers, and direct trip bookings.";

  const servicesGridClass = `${styles.fpGrid} ${
    services.length === 1
      ? styles.fpGridSingle
      : services.length === 2
        ? styles.fpGridDouble
        : ""
  }`;

  const tripsGridClass = `${styles.fpGrid} ${
    trips.length === 1
      ? styles.fpGridSingle
      : trips.length === 2
        ? styles.fpGridDouble
        : ""
  }`;

  return (
    <div id="company-public-profile" className={`page ${styles.page}`}>
      <div className={styles.shell}>
        {/* HERO — FEATURED PROPERTY CARD */}
        <header className={styles.hero} aria-labelledby="company-profile-title">
          <div className={styles.heroMedia} aria-hidden="true">
            {heroCoverUrl ? (
              <Image
                src={heroCoverUrl}
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 96vw, 1180px"
                className={styles.heroImage}
                unoptimized
              />
            ) : (
              <div className={styles.heroFallback}>
                <span className={styles.heroFallbackCircle}>
                  {companyInitials(company.name)}
                </span>
              </div>
            )}
          </div>
          <span className={styles.heroTopScrim} aria-hidden="true" />

          <div className={styles.heroTopBar}>
            <Link href="/companies/" className={styles.heroBackPill}>
              <ArrowLeft size={14} aria-hidden="true" />
              All companies
            </Link>

            <div className={styles.heroTopRight}>
              <span className={styles.heroVerifiedPill}>
                <ShieldCheck size={13} aria-hidden="true" />
                Verified company
              </span>

              {company.review_count > 0 ? (
                <span className={styles.heroStatPill}>
                  <Star size={12} aria-hidden="true" />
                  <strong>{Number(company.average_rating ?? 0).toFixed(1)}</strong>
                  <span>({company.review_count})</span>
                </span>
              ) : (
                <span className={styles.heroStatPill}>
                  <Car size={12} aria-hidden="true" />
                  <strong>{services.length}</strong>
                  <span>{services.length === 1 ? "vehicle" : "vehicles"}</span>
                </span>
              )}
            </div>
          </div>

          <div className={styles.heroSheet}>
            <div className={styles.heroIdentity}>
              <span className={styles.heroLogo} aria-hidden="true">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={`${company.name} logo`}
                    fill
                    sizes="68px"
                    className={styles.heroLogoImg}
                    unoptimized
                  />
                ) : (
                  companyInitials(company.name)
                )}
              </span>

              <div className={styles.heroCopy}>
                <span className={styles.heroKicker}>
                  {locationLabel} · Local Provider
                </span>
                <h1 id="company-profile-title" className={styles.heroTitle}>
                  {company.name}
                </h1>
                <p className={styles.heroDesc}>{descriptionText}</p>
              </div>
            </div>

            <div className={styles.heroBottomRow}>
              <ul className={styles.heroFacts} aria-label="Company highlights">
                <li>
                  <MapPin size={13} aria-hidden="true" />
                  <span>{locationLabel}</span>
                </li>
                <li>
                  <Car size={13} aria-hidden="true" />
                  <span>
                    {services.length}{" "}
                    {services.length === 1 ? "private hire service" : "private hire services"}
                  </span>
                </li>
                {uniqueDriversCount > 0 ? (
                  <li>
                    <UserCheck size={13} aria-hidden="true" />
                    <span>
                      {uniqueDriversCount}{" "}
                      {uniqueDriversCount === 1 ? "verified driver" : "verified drivers"}
                    </span>
                  </li>
                ) : null}
                {trips.length > 0 ? (
                  <li>
                    <Compass size={13} aria-hidden="true" />
                    <span>
                      {trips.length} {trips.length === 1 ? "published trip" : "published trips"}
                    </span>
                  </li>
                ) : null}
              </ul>

              <div className={styles.heroActions}>
                {telHref ? (
                  <a href={telHref} className={styles.heroGhostBtn}>
                    <Phone size={14} aria-hidden="true" />
                    Call
                  </a>
                ) : null}
                {services.length === 1 ? (
                  <Link
                    href={`/booking/${services[0].id}/`}
                    className={styles.heroPrimaryBtn}
                  >
                    <CalendarCheck2 size={15} aria-hidden="true" />
                    Book Private Hire
                  </Link>
                ) : services.length > 1 ? (
                  <a href="#company-services" className={styles.heroPrimaryBtn}>
                    <Car size={15} aria-hidden="true" />
                    View All {services.length} Services
                  </a>
                ) : (
                  <Link href="/booking/create/" className={styles.heroPrimaryBtn}>
                    Request Private Hire
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* SECTION 1: ASSIGNED PRIVATE HIRE SERVICES (FEATURED PROPERTY CARDS) */}
        <section
          id="company-services"
          className={styles.sectionBlock}
          aria-labelledby="company-services-title"
        >
          <div className={styles.sectionHead}>
            <div className={styles.sectionHeadCopy}>
              <span className={styles.sectionEyebrow}>
                <Car size={13} aria-hidden="true" />
                Private hire fleet
              </span>
              <h2 id="company-services-title" className={styles.sectionTitle}>
                Private hire services by {company.name}
              </h2>
            </div>
            <span className={styles.countBadge}>
              {services.length} {services.length === 1 ? "service" : "services"}
            </span>
          </div>

          {services.length === 0 ? (
            <div className={styles.emptyCard}>
              <span className={styles.emptyIcon} aria-hidden="true">
                <Car size={24} />
              </span>
              <h3>No private hire services listed yet</h3>
              <p>
                {company.name} hasn&apos;t assigned active private hire services yet. You can
                request an open Zanzibar trip or explore other verified companies.
              </p>
              <div className={styles.emptyActions}>
                <Link href="/booking/create/" className={styles.emptyPrimaryBtn}>
                  Request Private Hire
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/companies/" className={styles.emptyGhostBtn}>
                  Browse all companies
                </Link>
              </div>
            </div>
          ) : (
            <div className={servicesGridClass}>
              {services.map((service) => {
                const vehicle = service.vehicle;
                const photoUrl = vehicle?.front_image_url
                  ? getImageUrl(vehicle.front_image_url)
                  : null;
                const vehicleName = vehicle?.name?.trim() || "Private vehicle";
                const plate = vehicle?.plate_number?.trim() || "";
                const seats = Number(vehicle?.capacity ?? 0);
                const bags = Number(vehicle?.luggage_capacity ?? 0);
                const driverName = service.driver?.name?.trim() || "";
                const serviceDesc =
                  (typeof service.description === "string" && service.description.trim()) ||
                  (typeof vehicle?.description === "string" && vehicle.description.trim()) ||
                  "";

                return (
                  <article className={styles.fpCard} key={service.id}>
                    <div className={styles.fpMedia} aria-hidden="true">
                      {photoUrl ? (
                        <Image
                          src={photoUrl}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 48vw, (max-width: 1024px) 48vw, 380px"
                          className={styles.fpImage}
                          unoptimized
                        />
                      ) : (
                        <div className={styles.fpFallback}>
                          <Car size={48} />
                        </div>
                      )}
                    </div>
                    <span className={styles.fpTopScrim} aria-hidden="true" />

                    <div className={styles.fpTopBar}>
                      <span className={styles.fpGlassBadge}>
                        <ShieldCheck size={12} aria-hidden="true" />
                        <span className={styles.fpLabelFull}>Verified private hire</span>
                        <span className={styles.fpLabelShort}>Verified</span>
                      </span>
                    </div>

                    <div className={styles.fpSheet}>
                      <div className={styles.fpCopy}>
                        <span className={styles.fpKicker}>
                          {vehicle?.category
                            ? `${vehicle.category} · ${company.name}`
                            : `${company.name} · Private Hire`}
                        </span>
                        <h3 className={styles.fpTitle}>
                          <Link
                            href={`/transport/service/${service.id}/`}
                            className={styles.fpTitleLink}
                          >
                            {service.title || vehicleName}
                          </Link>
                        </h3>
                        {serviceDesc ? (
                          <p className={styles.fpDesc}>{serviceDesc}</p>
                        ) : null}
                      </div>

                      <div className={styles.fpBottomRow}>
                        <ul className={styles.fpFacts} aria-label="Vehicle specifications">
                          <li>
                            <Car size={12} aria-hidden="true" />
                            <span>{vehicleName}</span>
                            {plate ? <em>{plate}</em> : null}
                          </li>
                          {seats > 0 ? (
                            <li>
                              <Users size={12} aria-hidden="true" />
                              <span>{seats} pax</span>
                            </li>
                          ) : null}
                          {bags > 0 ? (
                            <li>
                              <Briefcase size={12} aria-hidden="true" />
                              <span>{bags} bags</span>
                            </li>
                          ) : null}
                          {driverName ? (
                            <li className={styles.fpDriverFact}>
                              <UserCheck size={12} aria-hidden="true" />
                              <span>{driverName}</span>
                            </li>
                          ) : null}
                        </ul>

                        <div className={styles.fpActionsRow}>
                          <Link
                            href={`/transport/service/${service.id}/`}
                            className={styles.fpGhostBtn}
                          >
                            Details
                          </Link>
                          <Link
                            href={`/booking/${service.id}/`}
                            className={styles.fpPrimaryBtn}
                          >
                            <CalendarCheck2 size={14} aria-hidden="true" />
                            <span className={styles.fpLabelFull}>Book This Service</span>
                            <span className={styles.fpLabelShort}>Book now</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: PUBLISHED TRIPS (ONLY SHOWN WHEN COMPANY HAS TRIPS) */}
        {trips.length > 0 ? (
          <section
            className={styles.sectionBlock}
            aria-labelledby="company-trips-title"
          >
            <div className={styles.sectionHead}>
              <div className={styles.sectionHeadCopy}>
                <span className={styles.sectionEyebrow}>
                  <Compass size={13} aria-hidden="true" />
                  Published routes
                </span>
                <h2 id="company-trips-title" className={styles.sectionTitle}>
                  Trips &amp; places
                </h2>
              </div>
              <span className={styles.countBadge}>
                {trips.length} {trips.length === 1 ? "trip" : "trips"}
              </span>
            </div>

            <div className={tripsGridClass}>
              {trips.map((trip) => {
                const tripImg = trip.image_url ? getImageUrl(trip.image_url) : null;
                const tripBookHref = services[0]?.id
                  ? `/booking/${services[0].id}/?destination=${encodeURIComponent(trip.place || trip.title)}`
                  : `/booking/create/?destination=${encodeURIComponent(trip.place || trip.title)}`;

                return (
                  <article className={styles.fpCard} key={trip.id}>
                    <div className={styles.fpMedia} aria-hidden="true">
                      {tripImg ? (
                        <Image
                          src={tripImg}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 48vw, (max-width: 1024px) 48vw, 380px"
                          className={styles.fpImage}
                          unoptimized
                        />
                      ) : (
                        <div className={styles.fpFallback}>
                          <MapPin size={44} />
                        </div>
                      )}
                    </div>
                    <span className={styles.fpTopScrim} aria-hidden="true" />

                    <div className={styles.fpTopBar}>
                      <span className={styles.fpGlassBadge}>
                        <MapPin size={11} aria-hidden="true" />
                        <span>{trip.place || locationLabel}</span>
                      </span>
                      {trip.price != null ? (
                        <div className={styles.fpPriceBox}>
                          <span className={styles.fpPriceValue}>
                            {formatPrice(trip.price)}
                          </span>
                          <span className={styles.fpPriceUnit}>/ trip</span>
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.fpSheet}>
                      <div className={styles.fpCopy}>
                        <span className={styles.fpKicker}>
                          {company.name} · Zanzibar Trip
                        </span>
                        <h3 className={styles.fpTitle}>{trip.title}</h3>
                        {trip.description ? (
                          <p className={styles.fpDesc}>{trip.description}</p>
                        ) : null}
                      </div>

                      <div className={styles.fpBottomRow}>
                        <div className={styles.fpActionsRow}>
                          <Link href={tripBookHref} className={styles.fpPrimaryBtn}>
                            <span className={styles.fpLabelFull}>Book This Trip</span>
                            <span className={styles.fpLabelShort}>Book trip</span>
                            <ArrowRight size={14} aria-hidden="true" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* SECTION 3: COMPANY OVERVIEW, CONTACT, LOCATION & OPENING HOURS */}
        <section className={styles.infoGrid} aria-label="Company details and contact">
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <span className={styles.panelIcon} aria-hidden="true">
                <Building2 size={18} />
              </span>
              <div>
                <span className={styles.panelKicker}>About the operator</span>
                <h2 className={styles.panelTitle}>About {company.name}</h2>
              </div>
            </div>

            <p className={styles.aboutText}>{descriptionText}</p>

            {telHref || company.contact_email || websiteUrl ? (
              <div className={styles.contactGrid}>
                {telHref ? (
                  <a href={telHref} className={styles.contactTile}>
                    <span className={styles.contactTileIcon} aria-hidden="true">
                      <Phone size={15} />
                    </span>
                    <span className={styles.contactTileCopy}>
                      <span className={styles.contactTileLabel}>Phone</span>
                      <strong className={styles.contactTileValue}>
                        {company.contact_phone}
                      </strong>
                    </span>
                  </a>
                ) : null}

                {company.contact_email ? (
                  <a
                    href={`mailto:${company.contact_email}`}
                    className={styles.contactTile}
                  >
                    <span className={styles.contactTileIcon} aria-hidden="true">
                      <Mail size={15} />
                    </span>
                    <span className={styles.contactTileCopy}>
                      <span className={styles.contactTileLabel}>Email</span>
                      <strong className={styles.contactTileValue}>
                        {company.contact_email}
                      </strong>
                    </span>
                  </a>
                ) : null}

                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.contactTile}
                  >
                    <span className={styles.contactTileIcon} aria-hidden="true">
                      <Globe size={15} />
                    </span>
                    <span className={styles.contactTileCopy}>
                      <span className={styles.contactTileLabel}>Website</span>
                      <strong className={styles.contactTileValue}>
                        Visit website
                        <ExternalLink size={12} aria-hidden="true" />
                      </strong>
                    </span>
                  </a>
                ) : null}
              </div>
            ) : null}

            {socialEntries.length > 0 ? (
              <div className={styles.socialRow}>
                {socialEntries.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.socialPill}
                  >
                    {item.label}
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ))}
              </div>
            ) : null}
          </article>

          <aside className={styles.sideColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHead}>
                <span className={styles.panelIcon} aria-hidden="true">
                  <MapPin size={18} />
                </span>
                <div>
                  <span className={styles.panelKicker}>Service area</span>
                  <h2 className={styles.panelTitle}>Location</h2>
                </div>
              </div>

              <div className={styles.locationBadge}>
                <MapPin size={14} aria-hidden="true" />
                <span>{locationLabel}</span>
              </div>

              {company.address ? (
                <p className={styles.addressText}>{company.address}</p>
              ) : (
                <p className={styles.locationNote}>
                  Operating airport transfers, Stone Town pickups, and private island journeys
                  across Zanzibar.
                </p>
              )}

              {mapUrl ? (
                <a
                  className={styles.mapAction}
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={15} aria-hidden="true" />
                  View on OpenStreetMap
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              ) : null}
            </article>

            {companyHours.length > 0 ? (
              <article className={styles.panel}>
                <div className={styles.panelHead}>
                  <span className={styles.panelIcon} aria-hidden="true">
                    <Clock size={18} />
                  </span>
                  <div>
                    <span className={styles.panelKicker}>Schedule</span>
                    <h2 className={styles.panelTitle}>Opening hours</h2>
                  </div>
                </div>

                <ul className={styles.hoursList}>
                  {companyHours.map((entry) => (
                    <li className={styles.hoursRow} key={entry.day}>
                      <strong>{entry.day}</strong>
                      <span>{entry.hours}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}
          </aside>
        </section>

        {/* BOTTOM NAVIGATION */}
        <div className={styles.bottomNav}>
          <Link href="/companies/" className={styles.bottomLink}>
            <ArrowLeft size={15} aria-hidden="true" />
            All companies
          </Link>
          <Link href="/transport/" className={styles.bottomLinkPrimary}>
            Browse all private hire
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

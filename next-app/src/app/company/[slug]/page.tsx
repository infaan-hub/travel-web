import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getPublicCompany } from "@/lib/services/public-companies";
import Link from "next/link";
import {
  ArrowLeft,
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
import { CalendarCheck2 } from "lucide-react";
import { getImageUrl } from "@/lib/utils/image-url";
import { openingHoursEntries } from "@/lib/company-opening-hours";
import styles from "@/features/pages/company-profile-page.module.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = (await getPublicCompany(slug)) as any;
  if (!company) return { title: "Company not found" };
  return {
    title: company.name,
    description: company.description || `Private hire services operated by ${company.name}.`,
  };
}

export default async function CompanyProfilePage({ params }: Props) {
  const { slug } = await params;
  const company = (await getPublicCompany(slug)) as any;
  if (!company) notFound();

  const services = Array.isArray(company.services) ? company.services : [];
  const trips = Array.isArray(company.trips) ? company.trips : [];
  const companyHours = openingHoursEntries(company.opening_hours);
  const locationParts: string[] = [];
  const seenLoc = new Set<string>();
  for (const value of [company.locality, company.district, company.region]) {
    const cleaned = typeof value === "string" ? value.trim() : "";
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (key === "tanzania" || seenLoc.has(key)) continue;
    seenLoc.add(key);
    locationParts.push(cleaned);
    if (locationParts.length >= 2) break;
  }
  if (locationParts.length === 0) {
    locationParts.push("Zanzibar");
  } else if (!locationParts.some((p) => p.toLowerCase().includes("zanzibar"))) {
    locationParts.push("Zanzibar");
  }
  const locationLabel = locationParts.join(", ");
  const hasCoordinates = company.latitude != null && company.longitude != null;

  return (
    <div className={`page ${styles.page}`}>
      <div className={styles.shell}>
        <Link href="/companies/" className={styles.topBack}>
          <ArrowLeft size={15} aria-hidden="true" />
          Back to companies
        </Link>

        <section className={styles.hero} aria-labelledby="company-profile-title">
          <div className={styles.coverFrame}>
            {company.cover_image_url ? (
              <Image
                src={getImageUrl(company.cover_image_url)}
                alt=""
                fill
                priority
                sizes="(max-width: 1180px) 100vw, 1180px"
                className={styles.cover}
              />
            ) : (
              <div className={styles.coverFallback} />
            )}
            <div className={styles.coverShade} />

            <div className={styles.identity}>
              <div className={styles.logoFrame}>
                {company.logo_image_url ? (
                  <Image
                    src={getImageUrl(company.logo_image_url)}
                    alt={`${company.name} logo`}
                    width={84}
                    height={84}
                    className={styles.logo}
                  />
                ) : (
                  <span className={styles.logoFallback}>
                    <Building2 size={30} aria-hidden="true" />
                  </span>
                )}
              </div>

              <div className={styles.identityMain}>
                <p className={styles.eyebrow}>
                  <Building2 size={13} aria-hidden="true" />
                  Company profile
                </p>
                <h1 id="company-profile-title" className={styles.title}>
                  {company.name}
                </h1>
                {locationLabel ? (
                  <p className={styles.hq}>
                    <MapPin size={15} aria-hidden="true" />
                    {locationLabel}
                  </p>
                ) : null}
              </div>

              {company.review_count > 0 ? (
                <div className={styles.ratingChip}>
                  <Star size={16} aria-hidden="true" />
                  <strong>{Number(company.average_rating ?? 0).toFixed(1)}</strong>
                  <span>
                    from {company.review_count} approved review
                    {company.review_count === 1 ? "" : "s"}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className={styles.contentGrid}>
          <article className={styles.card}>
            <header className={styles.cardHead}>
              <span className={styles.cardIcon}>
                <Building2 size={19} aria-hidden="true" />
              </span>
              <div>
                <p className={styles.cardKicker}>Company profile</p>
                <h2>About</h2>
              </div>
            </header>

            <p className={styles.aboutText}>
              {company.description || "No company description provided."}
            </p>

            {company.contact_email || company.contact_phone || company.website ? (
              <dl className={styles.detailList}>
                {company.contact_email ? (
                  <div className={styles.detailRow}>
                    <dt>
                      <Mail size={14} aria-hidden="true" />
                      Email
                    </dt>
                    <dd>
                      <a href={`mailto:${company.contact_email}`}>
                        {company.contact_email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {company.contact_phone ? (
                  <div className={styles.detailRow}>
                    <dt>
                      <Phone size={14} aria-hidden="true" />
                      Phone
                    </dt>
                    <dd>
                      <a href={`tel:${company.contact_phone}`}>
                        {company.contact_phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {company.website ? (
                  <div className={styles.detailRow}>
                    <dt>
                      <Globe size={14} aria-hidden="true" />
                      Website
                    </dt>
                    <dd>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Visit website
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </article>

          <aside className={styles.sideColumn}>
            <article className={styles.card}>
              <header className={styles.cardHead}>
                <span className={styles.cardIcon}>
                  <MapPin size={19} aria-hidden="true" />
                </span>
                <div>
                  <p className={styles.cardKicker}>Where to find us</p>
                  <h2>Location</h2>
                </div>
              </header>

              {company.address ? (
                <p className={styles.address}>{company.address}</p>
              ) : null}
              <p className={styles.coordinates}>
                {hasCoordinates
                  ? `Coordinates: ${company.latitude}, ${company.longitude}`
                  : "Address details are provided; no map marker is available."}
              </p>
              {company.map_url ? (
                <a
                  className={styles.mapLink}
                  href={company.map_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={15} aria-hidden="true" />
                  View on OpenStreetMap
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              ) : null}
            </article>

            {companyHours.length ? (
              <article className={styles.card}>
                <header className={styles.cardHead}>
                  <span className={styles.cardIcon}>
                    <Clock size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <p className={styles.cardKicker}>Visit us</p>
                    <h2>Opening hours</h2>
                  </div>
                </header>

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
        </div>

        <section
          className={styles.sectionCard}
          aria-labelledby="company-services-title"
        >
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>
              <span className={styles.cardIcon}>
                <Compass size={19} aria-hidden="true" />
              </span>
              <div>
                <p className={styles.cardKicker}>Private hire</p>
                <h2 id="company-services-title">Available services</h2>
              </div>
            </div>
            <p className={styles.countPill}>
              {services.length} available service{services.length === 1 ? "" : "s"}
            </p>
          </div>

          {services.length === 0 ? (
            <div className={styles.empty}>
              <span>
                <Building2 size={26} aria-hidden="true" />
              </span>
              <p>This company has no private-hire services listed yet.</p>
            </div>
          ) : (
            <div className={styles.toursGrid}>
              {services.map((service: any) => {
                const vehicle = service.vehicle;
                const photoUrl = vehicle?.front_image_url
                  ? getImageUrl(vehicle.front_image_url)
                  : null;
                const pricingLabel = String(service.pricing_type || "per_trip").replaceAll("_", " ");
                const seats = Number(vehicle?.capacity ?? 0);
                const bags = Number(vehicle?.luggage_capacity ?? 0);

                return (
                  <article className={styles.tripCard} key={service.id}>
                    <Link href={`/transport/service/${service.id}/`} className={styles.tripMedia}>
                      {photoUrl ? (
                        <Image
                          src={photoUrl}
                          alt={vehicle?.name || service.title}
                          fill
                          sizes="(max-width: 560px) 92vw, (max-width: 1024px) 45vw, 360px"
                          className={styles.tripImage}
                          unoptimized
                        />
                      ) : (
                        <span className={styles.tripFallback}>
                          <Car size={28} aria-hidden="true" />
                        </span>
                      )}
                    </Link>
                    <div className={styles.tripBody}>
                      <h3>
                        <Link href={`/transport/service/${service.id}/`} className={styles.serviceTitleLink}>
                          {service.title}
                        </Link>
                      </h3>
                      <p className={styles.tripPlace}>
                        <Car size={14} aria-hidden="true" />
                        <span>{vehicle?.name || "Private hire vehicle"}</span>
                        {vehicle?.plate_number ? (
                          <span className={styles.servicePlate}>{vehicle.plate_number}</span>
                        ) : null}
                      </p>
                      <div className={styles.serviceSpecs}>
                        {seats > 0 ? (
                          <span>
                            <Users size={13} aria-hidden="true" />
                            {seats} pax
                          </span>
                        ) : null}
                        {bags > 0 ? (
                          <span>
                            <Briefcase size={13} aria-hidden="true" />
                            {bags} bags
                          </span>
                        ) : null}
                      </div>
                      {service.description ? (
                        <p className={styles.tripDesc}>{service.description}</p>
                      ) : null}
                      <p className={styles.tripPrice}>
                        <span>From</span> ${Number(service.price).toLocaleString("en-US")} / {pricingLabel}
                      </p>
                      <div className={styles.serviceActions}>
                        <Link
                          href={`/transport/service/${service.id}/`}
                          className={styles.serviceDetailBtn}
                        >
                          Details
                        </Link>
                        <Link
                          href={`/booking/${service.id}/`}
                          className={styles.serviceBookBtn}
                        >
                          <CalendarCheck2 size={14} aria-hidden="true" />
                          Book This Service
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section
          className={styles.sectionCard}
          aria-labelledby="company-trips-title"
        >
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>
              <span className={styles.cardIcon}>
                <MapPin size={19} aria-hidden="true" />
              </span>
              <div>
                <p className={styles.cardKicker}>Nearby</p>
                <h2 id="company-trips-title">Trips and places</h2>
              </div>
            </div>
            <p className={styles.countPill}>
              {trips.length} trip{trips.length === 1 ? "" : "s"}
            </p>
          </div>

          {trips.length === 0 ? (
            <div className={styles.empty}>
              <span>
                <Building2 size={26} aria-hidden="true" />
              </span>
              <p>This company has no trip listings yet.</p>
            </div>
          ) : (
            <div className={styles.tripsGrid}>
              {trips.map((trip: any) => (
                <article className={styles.tripCard} key={trip.id}>
                  <div className={styles.tripMedia}>
                    {trip.image_url ? (
                      <Image
                        src={getImageUrl(trip.image_url)}
                        alt={trip.title}
                        fill
                        sizes="(max-width: 560px) 92vw, (max-width: 1024px) 45vw, 360px"
                        className={styles.tripImage}
                      />
                    ) : (
                      <span className={styles.tripFallback}>
                        <MapPin size={28} aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <div className={styles.tripBody}>
                    <h3>{trip.title}</h3>
                    <p className={styles.tripPlace}>
                      <MapPin size={14} aria-hidden="true" />
                      {trip.place}
                    </p>
                    {trip.description ? (
                      <p className={styles.tripDesc}>{trip.description}</p>
                    ) : null}
                    <p className={styles.tripPrice}>
                      <span>From</span> $
                      {Number(trip.price ?? 0).toLocaleString("en-US")}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className={styles.backLink}>
          <Link href="/companies/">
            <ArrowLeft size={15} aria-hidden="true" />
            Back to companies
          </Link>
        </div>
      </div>
    </div>
  );
}

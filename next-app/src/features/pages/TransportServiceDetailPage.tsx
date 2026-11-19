"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Car,
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { publicPrivateHireAPI } from "@/lib/api/client";
import { getImageUrl } from "@/lib/utils/image-url";
import {
  PRICING_LABELS,
  SAMPLE_PRIVATE_HIRE_SERVICES,
  type PrivateHireService,
} from "@/features/transport/private-hire-data";
import styles from "@/features/pages/transport-service-detail.module.css";

type Props = {
  id: string;
};

function phoneDigits(value: string): string {
  return value.replace(/[^\d]/g, "");
}

/**
 * Standalone version of the former "Tourist Booking View" modal. Driver
 * licence and ID numbers are intentionally never rendered.
 */
export default function TransportServiceDetailPage({ id }: Props) {
  const sample = SAMPLE_PRIVATE_HIRE_SERVICES.find((item) => String(item.id) === id) ?? null;
  const [service, setService] = useState<PrivateHireService | null>(sample);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    publicPrivateHireAPI
      .getById(id)
      .then((response) => {
        if (!cancelled) setService(response.data as PrivateHireService);
      })
      .catch(() => {
        if (!cancelled) setService(sample);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, sample]);

  if (loading && !service) {
    return (
      <div className={styles.page}>
        <div className={styles.stateCard} role="status">
          <Loader2 className={styles.spinner} size={28} />
          <p>Loading service details…</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className={styles.page}>
        <div className={styles.stateCard}>
          <span className={styles.stateIcon}>
            <Car size={26} />
          </span>
          <h1>Service not found</h1>
          <p>This private hire service may have been removed or is no longer available.</p>
          <Link href="/transport/" className={styles.stateLink}>
            <ArrowLeft size={16} /> Back to transport
          </Link>
        </div>
      </div>
    );
  }

  const { vehicle, driver, company } = service;
  const pricingType = service.pricing_type || "";
  const pricingLabel =
    PRICING_LABELS[pricingType] ?? (pricingType ? pricingType.replaceAll("_", " ") : "per trip");
  const includes = vehicle?.includes ?? [];
  const excludes = vehicle?.excludes ?? [];
  const driverName = driver?.name?.trim() || "Assigned driver";
  const photos = vehicle
    ? [
        { label: "Front view", url: vehicle.front_image_url, main: true },
        { label: "Side view", url: vehicle.side_image_url, main: false },
        { label: "Back view", url: vehicle.back_image_url, main: false },
      ]
    : [];

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <Link href="/transport/" className={styles.backLink}>
            <ArrowLeft size={16} /> Back to transport
          </Link>
          <span className={styles.heroBadge}>
            <ShieldCheck size={14} /> Verified private hire
          </span>
        </div>

        <div className={styles.heroBody}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>Tourist Booking View</span>
            <h1 className={styles.title}>{service.title}</h1>
            {company ? <p className={styles.company}>{company.name}</p> : null}
            {service.description ? <p className={styles.description}>{service.description}</p> : null}
          </div>
          <div className={styles.heroPrice}>
            <span className={styles.priceValue}>${service.price}</span>
            <span className={styles.priceUnit}>/ {pricingLabel}</span>
          </div>
        </div>

        {vehicle ? (
          <ul className={styles.heroFacts}>
            <li>
              <Car size={16} />
              <span>{vehicle.name}</span>
              {vehicle.plate_number ? <em>{vehicle.plate_number}</em> : null}
            </li>
            <li>
              <Users size={16} />
              <span>{vehicle.capacity} passengers</span>
            </li>
            <li>
              <Briefcase size={16} />
              <span>{vehicle.luggage_capacity} luggage bags</span>
            </li>
          </ul>
        ) : null}
      </header>

      <div className={styles.layout}>
        <main className={styles.main}>
          {vehicle ? (
            <section className={styles.panel} aria-labelledby="vehicle-heading">
              <div className={styles.panelHead}>
                <div>
                  <span className={styles.sectionKicker}>Vehicle</span>
                  <h2 id="vehicle-heading" className={styles.panelTitle}>
                    {vehicle.name}
                  </h2>
                </div>
                {vehicle.plate_number ? (
                  <span className={styles.plate}>Plate: {vehicle.plate_number}</span>
                ) : null}
              </div>

              <div className={styles.photoGrid}>
                {photos.map((photo) => (
                  <figure key={photo.label} className={styles.photo}>
                    <div className={styles.photoFrame}>
                      {photo.url ? (
                        <Image
                          src={getImageUrl(photo.url)}
                          alt={`${vehicle.name} — ${photo.label}`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 340px"
                          className={styles.photoImage}
                          loading={photo.main ? "eager" : "lazy"}
                          unoptimized
                        />
                      ) : (
                        <div className={styles.photoEmpty}>
                          <Car size={22} />
                          <span>No photo</span>
                        </div>
                      )}
                      {photo.main ? <span className={styles.photoTag}>Main</span> : null}
                    </div>
                    <figcaption>{photo.label}</figcaption>
                  </figure>
                ))}
              </div>

              <dl className={styles.specs}>
                <div>
                  <dt>
                    <Users size={15} /> Passengers
                  </dt>
                  <dd>{vehicle.capacity}</dd>
                </div>
                <div>
                  <dt>
                    <Briefcase size={15} /> Luggage
                  </dt>
                  <dd>{vehicle.luggage_capacity} bags</dd>
                </div>
                <div>
                  <dt>
                    <Car size={15} /> Category
                  </dt>
                  <dd>{vehicle.category || "Private hire"}</dd>
                </div>
              </dl>

              {vehicle.description ? <p className={styles.vehicleNote}>{vehicle.description}</p> : null}

              <div className={styles.includesGrid}>
                <div className={styles.includesBlock}>
                  <h3 className={styles.includesTitle}>
                    <CheckCircle2 size={16} /> What&apos;s included
                  </h3>
                  {includes.length > 0 ? (
                    <ul className={styles.includesList}>
                      {includes.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.emptyNote}>Inclusions will be confirmed by the provider.</p>
                  )}
                </div>
                <div className={`${styles.includesBlock} ${styles.excludesBlock}`}>
                  <h3 className={`${styles.includesTitle} ${styles.excludesTitle}`}>
                    <XCircle size={16} /> What&apos;s excluded
                  </h3>
                  {excludes.length > 0 ? (
                    <ul className={styles.includesList}>
                      {excludes.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.emptyNote}>No exclusions were listed.</p>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {driver ? (
            <section className={`${styles.panel} ${styles.driverPanel}`} aria-labelledby="driver-heading">
              <div className={styles.panelHead}>
                <div>
                  <span className={styles.sectionKicker}>Driver</span>
                  <h2 id="driver-heading" className={styles.panelTitle}>
                    Assigned private hire driver
                  </h2>
                </div>
                <span className={styles.verifiedPill}>
                  <ShieldCheck size={14} /> Verified
                </span>
              </div>

              <div className={styles.driverRow}>
                {driver.image_url ? (
                  <Image
                    src={getImageUrl(driver.image_url)}
                    alt={driverName}
                    width={76}
                    height={76}
                    className={styles.driverAvatar}
                    unoptimized
                  />
                ) : (
                  <div className={styles.driverAvatarFallback} aria-hidden="true">
                    {driverName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className={styles.driverInfo}>
                  <strong className={styles.driverName}>{driverName}</strong>
                  <span className={styles.driverRole}>Professional chauffeur</span>
                  <div className={styles.driverContacts}>
                    {driver.phone ? (
                      <a href={`tel:${phoneDigits(driver.phone)}`}>
                        <Phone size={14} /> {driver.phone}
                      </a>
                    ) : null}
                    {driver.email ? (
                      <a href={`mailto:${driver.email}`}>
                        <Mail size={14} /> {driver.email}
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </main>

        <aside className={styles.aside}>
          <div className={styles.bookingCard}>
            <span className={styles.asideKicker}>Starting price</span>
            <p className={styles.asidePrice}>
              ${service.price}
              <span>/ {pricingLabel}</span>
            </p>
            {vehicle ? (
              <p className={styles.asideNote}>
                {vehicle.name} · up to {vehicle.capacity} passengers and {vehicle.luggage_capacity} bags
              </p>
            ) : null}

            <Link href={`/booking/${service.id}/`} className={styles.bookButton}>
              Book This Service
            </Link>

            {company?.contact_phone ? (
              <div className={styles.contactActions}>
                <a href={`tel:${phoneDigits(company.contact_phone)}`} className={styles.contactLink}>
                  <Phone size={16} /> Call provider
                </a>
                <a
                  href={`https://wa.me/${phoneDigits(company.contact_phone)}`}
                  className={styles.contactLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </div>
            ) : null}

            {company ? (
              <Link href={`/company/${company.slug}/`} className={styles.providerLink}>
                <Building2 size={16} /> View provider profile
              </Link>
            ) : null}

            {driver ? (
              <p className={styles.driverNote}>
                <UserCheck size={15} /> Driver: {driverName}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

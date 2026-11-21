"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Briefcase,
  CalendarCheck2,
  Car,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { publicPrivateHireAPI } from "@/lib/api/client";
import { getImageUrl } from "@/lib/utils/image-url";
import {
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
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

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
  const includes = vehicle?.includes ?? [];
  const excludes = vehicle?.excludes ?? [];
  const driverName = driver?.name?.trim() || "Assigned driver";
  const photos = vehicle
    ? [
        { label: "Front", fullLabel: "Front view", url: vehicle.front_image_url, main: true },
        { label: "Side", fullLabel: "Side view", url: vehicle.side_image_url, main: false },
        { label: "Back", fullLabel: "Back view", url: vehicle.back_image_url, main: false },
      ]
    : [];
  const availablePhotos = photos.filter((p) => Boolean(p.url));
  const activeHeroPhoto =
    availablePhotos[activePhotoIndex] ?? availablePhotos[0] ?? null;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroMedia} aria-hidden="true">
          {activeHeroPhoto?.url ? (
            <Image
              src={getImageUrl(activeHeroPhoto.url)}
              alt=""
              fill
              sizes="(max-width: 768px) 92vw, 1180px"
              className={styles.heroImage}
              priority
              unoptimized
            />
          ) : (
            <div className={styles.heroMediaFallback}>
              <Car size={62} />
            </div>
          )}
        </div>
        <span className={styles.heroTopScrim} aria-hidden="true" />

        <div className={styles.heroTop}>
          <Link href="/transport/" className={styles.backLink}>
            <ArrowLeft size={15} /> Back to transport
          </Link>
          <div className={styles.heroTopRight}>
            <span className={styles.heroBadge}>
              <ShieldCheck size={13} /> Verified private hire
            </span>
          </div>
        </div>

        <div className={styles.heroSheet}>
          <div className={styles.heroBody}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>
                {company?.name ? `${company.name} · Private Hire` : "Verified Private Hire"}
              </span>
              <h1 className={styles.title}>{service.title}</h1>
              {service.description ? <p className={styles.description}>{service.description}</p> : null}
            </div>

            {availablePhotos.length > 1 ? (
              <div className={styles.heroAnglePills} role="tablist" aria-label="Vehicle photo angle">
                {availablePhotos.map((photo, index) => (
                  <button
                    key={photo.label}
                    type="button"
                    role="tab"
                    aria-selected={index === activePhotoIndex}
                    className={`${styles.heroAngleBtn} ${
                      index === activePhotoIndex ? styles.heroAngleBtnActive : ""
                    }`}
                    onClick={() => setActivePhotoIndex(index)}
                  >
                    {photo.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.heroBottomRow}>
            {vehicle ? (
              <ul className={styles.heroFacts}>
                <li>
                  <Car size={15} />
                  <span>{vehicle.name}</span>
                  {vehicle.plate_number ? <em>{vehicle.plate_number}</em> : null}
                </li>
                <li>
                  <Users size={15} />
                  <span>{vehicle.capacity} pax</span>
                </li>
                <li>
                  <Briefcase size={15} />
                  <span>{vehicle.luggage_capacity} bags</span>
                </li>
              </ul>
            ) : (
              <div />
            )}

            <Link href={`/booking/${service.id}/`} className={styles.heroBookAction}>
              <CalendarCheck2 size={17} /> Book This Service
            </Link>
          </div>
        </div>
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
                {photos.map((photo) => {
                  const availIdx = availablePhotos.findIndex((p) => p.label === photo.label);
                  return (
                    <figure
                      key={photo.fullLabel}
                      className={styles.photo}
                      onClick={() => {
                        if (availIdx >= 0) setActivePhotoIndex(availIdx);
                      }}
                      style={availIdx >= 0 ? { cursor: "pointer" } : undefined}
                    >
                      <div className={styles.photoFrame}>
                        {photo.url ? (
                          <Image
                            src={getImageUrl(photo.url)}
                            alt={`${vehicle.name} — ${photo.fullLabel}`}
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
                      <figcaption>{photo.fullLabel}</figcaption>
                    </figure>
                  );
                })}
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
                    Private hire driver
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
      </div>
    </div>
  );
}

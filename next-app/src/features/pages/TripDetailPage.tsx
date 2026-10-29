"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { tripsAPI } from "@/lib/api/client";
import { readClientCache, writeClientCache } from "@/lib/cache/client-cache";
import { getImageUrl } from "@/lib/utils/image-url";
import { ArrowLeft, MapPin, Clock, Building2 } from "@/components/icons";
import { tripPlaceNameForCoords } from "@/lib/trips";
import TripRouteOverlayMap from "@/components/TripRouteOverlayMap";
import type { CompanyTrip } from "@/features/pages/types";
import styles from "@/features/pages/trips-page.module.css";

function formatDuration(mins: number | null | undefined) {
  if (mins == null || !Number.isFinite(mins)) return null;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [trip, setTrip] = useState<CompanyTrip | null>(() =>
    id ? readClientCache<CompanyTrip>(`travel.trip.${id}`) ?? null : null,
  );
  const [loading, setLoading] = useState<boolean>(() => !trip);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    tripsAPI
      .getById(id)
      .then((res) => {
        const next = res.data?.results || res.data;
        setTrip(next);
        writeClientCache(`travel.trip.${id}`, next);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className={`${styles.tripsPageRoot} ${styles.tripDetailRoot}`}>
        <div className={styles.tripDetailContent}>
          <div className={styles.tripsLoading}>Loading trip…</div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className={`${styles.tripsPageRoot} ${styles.tripDetailRoot}`}>
        <div className={styles.tripDetailContent}>
          <div className={styles.tripsEmpty}>
            <h2 className={styles.tripsStateTitle}>Trip not found</h2>
            <p className={styles.tripsStateCopy}>Check back soon for new trips from travel companies.</p>
            <Link href="/trips/" className={styles.tripBackLink}>
              Back to trips
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const originName =
    trip.place || tripPlaceNameForCoords(trip.origin_latitude ?? trip.latitude, trip.origin_longitude ?? trip.longitude);
  const destinationName = tripPlaceNameForCoords(trip.destination_latitude, trip.destination_longitude);
  const routeLabel =
    originName && destinationName ? `${originName} â†’ ${destinationName}` : originName || destinationName || trip.place || "Trip";
  const distanceLabel =
    trip.distance_km != null && Number.isFinite(Number(trip.distance_km))
      ? `${Number(trip.distance_km).toFixed(1)} km`
      : null;
  const durationLabel = formatDuration(trip.duration_mins);
  const originLat = trip.origin_latitude ?? trip.latitude;
  const originLng = trip.origin_longitude ?? trip.longitude;
  const destLat = trip.destination_latitude;
  const destLng = trip.destination_longitude;
  const hasRouteMap =
    Number.isFinite(Number(originLat)) &&
    Number.isFinite(Number(originLng)) &&
    Number.isFinite(Number(destLat)) &&
    Number.isFinite(Number(destLng));

  return (
    <div className={`${styles.tripsPageRoot} ${styles.tripDetailRoot}`}>
      <div className={`${styles.tripDetailContent}`}>
        <Link href="/trips/" className={`${styles.tripBackLink}`}>
          <ArrowLeft size={16} /> Back to trips
        </Link>

        <article className={styles.tripDetailCard}>
          {trip.image_url ? (
            <div className={styles.tripDetailImage}>
              <Image src={getImageUrl(trip.image_url)} alt={trip.title} fill sizes="(max-width: 760px) 100vw, 1100px" priority style={{ objectFit: "cover" }} />
              <div className={styles.tripImageShade} aria-hidden="true" />
              <div className={styles.tripImageCaption}>
                <span className={styles.tripImageEyebrow}>Trip overview</span>
                <h1>{trip.title}</h1>
                <p><MapPin size={16} /> {routeLabel}</p>
              </div>
            </div>
          ) : (
            <header className={styles.tripDetailHeader}>
              <span className={styles.tripDetailEyebrow}>Trip overview</span>
              <h1>{trip.title}</h1>
              <p className={styles.tripDetailRoute}><MapPin size={17} /> {routeLabel}</p>
            </header>
          )}

          <div className={styles.tripDetailBody}>
            <section className={styles.tripInfoSection} aria-label="Trip information">
              <div className={styles.tripSectionHeading}>
                <span className={styles.tripSectionIcon}><MapPin size={18} /></span>
                <div>
                  <span className={styles.tripDetailEyebrow}>Your journey</span>
                  <h2>Trip details</h2>
                </div>
              </div>
              <p className={styles.tripDescription}>{trip.description || "Explore the route and trip details below."}</p>
              <div className={styles.tripStatsGrid}>
                <div className={`${styles.tripStatCard} ${styles.tripPriceCard}`}>
                  <span className={styles.tripStatLabel}>Trip price</span>
                  <strong>{trip.price ? `$${trip.price}` : "On request"}</strong>
                </div>
                {distanceLabel ? (
                  <div className={styles.tripStatCard}>
                    <span className={styles.tripStatLabel}>Distance</span>
                    <strong>{distanceLabel}</strong>
                  </div>
                ) : null}
                {durationLabel ? (
                  <div className={styles.tripStatCard}>
                    <span className={styles.tripStatLabel}>Travel time</span>
                    <strong><Clock size={16} /> {durationLabel}</strong>
                  </div>
                ) : null}
              </div>
            </section>

            {hasRouteMap ? (
              <section className={styles.tripMapSection} aria-label="Route map">
                <div className={styles.tripSectionHeading}>
                  <span className={styles.tripSectionIcon}><MapPin size={18} /></span>
                  <div>
                    <span className={styles.tripDetailEyebrow}>On the map</span>
                    <h2>Route</h2>
                  </div>
                </div>
                <div className={styles.tripMapCard}>
                  <TripRouteOverlayMap
                    originLat={Number(originLat)}
                    originLng={Number(originLng)}
                    destinationLat={Number(destLat)}
                    destinationLng={Number(destLng)}
                  />
                </div>
              </section>
            ) : null}

            {trip.company_name ? (
              <section className={styles.tripOperatorCard} aria-label="Trip operator">
                <span className={styles.tripOperatorIcon}><Building2 size={20} /></span>
                <div className={styles.tripOperatorCopy}>
                  <span className={styles.tripDetailEyebrow}>Your travel provider</span>
                  <strong>{trip.company_name}</strong>
                </div>
                {trip.company_slug ? (
                  <Link href={`/company/${trip.company_slug}/`} className={styles.tripOperatorLink}>
                    View company <ArrowLeft size={15} />
                  </Link>
                ) : null}
              </section>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}











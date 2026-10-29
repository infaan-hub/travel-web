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
import TripRouteMap from "@/components/TripRouteMap";
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
      <div className={styles.tripsPageRoot}>
        <div className={styles.content}>
          <div className={styles.tripsLoading}>Loading trip…</div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className={styles.tripsPageRoot}>
        <div className={styles.content}>
          <div className={styles.tripsEmpty}>
            <h2>Trip not found</h2>
            <p>Check back soon for new trips from travel companies.</p>
            <Link href="/trips/" className="btn btn-outline btn-sm">
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
    originName && destinationName ? `${originName} → ${destinationName}` : originName || destinationName || trip.place || "Trip";

  const distanceLabel =
    trip.distance_km != null && Number.isFinite(Number(trip.distance_km))
      ? `${Number(trip.distance_km).toFixed(1)} km`
      : null;
  const durationLabel = formatDuration(trip.duration_mins);
  const originLat = trip.origin_latitude ?? trip.latitude;
  const originLng = trip.origin_longitude ?? trip.longitude;
  const destLat = trip.destination_latitude;
  const destLng = trip.destination_longitude;

  return (
    <div className={styles.tripsPageRoot}>
      <div className={styles.content}>
        <Link href="/trips/" className="btn btn-outline btn-sm" style={{ marginBottom: 18, width: "fit-content" }}>
          <ArrowLeft size={16} /> Back to trips
        </Link>

        <article
          style={{
            display: "grid",
            gap: 22,
            padding: 24,
            borderRadius: 22,
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.55)",
            boxShadow: "0 18px 44px rgba(8,66,140,0.09)",
            backdropFilter: "blur(18px) saturate(160%)",
          }}
        >
          {trip.image_url ? (
            <div style={{ position: "relative", width: "100%", height: 320, borderRadius: 16, overflow: "hidden" }}>
              <Image
                src={getImageUrl(trip.image_url)}
                alt={trip.title}
                fill
                sizes="100vw"
                style={{ objectFit: "cover" }}
              />
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#08428c" }}>{trip.title}</h1>
            <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, color: "rgba(8,66,140,0.72)", fontWeight: 600 }}>
              <MapPin size={16} /> {routeLabel}
            </p>
            {trip.description ? (
              <p style={{ margin: 0, color: "rgba(8,66,140,0.72)", lineHeight: 1.65 }}>{trip.description}</p>
            ) : null}
          </div>

          {Number.isFinite(Number(originLat)) &&
          Number.isFinite(Number(originLng)) &&
          Number.isFinite(Number(destLat)) &&
          Number.isFinite(Number(destLng)) ? (
            <TripRouteMap
              originLat={Number(originLat)}
              originLng={Number(originLng)}
              destinationLat={Number(destLat)}
              destinationLng={Number(destLng)}
            />
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <span
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(8,66,140,0.09)",
                color: "#08428c",
                fontWeight: 700,
              }}
            >
              {trip.price ? `$${trip.price}` : "On request"}
            </span>
            {distanceLabel ? (
              <span style={{ padding: "8px 14px", borderRadius: 999, background: "rgba(8,66,140,0.06)", color: "#08428c", fontWeight: 600 }}>
                {distanceLabel}
              </span>
            ) : null}
            {durationLabel ? (
              <span style={{ padding: "8px 14px", borderRadius: 999, background: "rgba(8,66,140,0.06)", color: "#08428c", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Clock size={14} /> {durationLabel}
              </span>
            ) : null}
          </div>

          {trip.company_name ? (
            <Link
              href={trip.company_slug ? `/company/${trip.company_slug}/` : "#"}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#08428c", fontWeight: 600, width: "fit-content" }}
            >
              <Building2 size={16} /> Operated by {trip.company_name}
            </Link>
          ) : null}
        </article>
      </div>
    </div>
  );
}
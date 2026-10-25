"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { openStreetMapUrl } from "@/lib/company-domain";
import styles from "@/features/pages/admin-companies.module.css";

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
  disabled?: boolean;
  label?: string;
};

const TANZANIA_CENTER: [number, number] = [-6.369, 34.8888];

function validCoordinates(latitude: number | null, longitude: number | null) {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  disabled = false,
  label = "Company location map",
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
    disabledRef.current = disabled;
  }, [onChange, disabled]);

  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;

    void import("leaflet")
      .then((leaflet) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const hasPoint = validCoordinates(latitude, longitude);
        const map = leaflet.map(containerRef.current, {
          center: hasPoint ? [latitude as number, longitude as number] : TANZANIA_CENTER,
          zoom: hasPoint ? 13 : 6,
          scrollWheelZoom: false,
        });
        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          })
          .addTo(map);

        map.on("click", (event: Leaflet.LeafletMouseEvent) => {
          if (disabledRef.current) return;
          onChangeRef.current(
            Math.round(event.latlng.lat * 1_000_000) / 1_000_000,
            Math.round(event.latlng.lng * 1_000_000) / 1_000_000,
          );
        });

        leafletRef.current = leaflet;
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
    // The map is initialized once. Coordinate updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !ready) return;
    const hasPoint = validCoordinates(latitude, longitude);

    if (!hasPoint) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const point: [number, number] = [latitude as number, longitude as number];
    if (!markerRef.current) {
      const marker = leaflet
        .marker(point, {
          draggable: true,
          icon: leaflet.divIcon({
            className: styles.mapMarker,
            html:
              '<span style="display:block;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--map-marker,#0F6B6B);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>',
            iconSize: [28, 28],
            iconAnchor: [14, 28],
          }),
        })
        .addTo(map);
      marker.on("dragend", () => {
        const next = marker.getLatLng();
        onChangeRef.current(
          Math.round(next.lat * 1_000_000) / 1_000_000,
          Math.round(next.lng * 1_000_000) / 1_000_000,
        );
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(point);
    }

    if (!map.getBounds().contains(point) || map.getZoom() < 10) {
      map.setView(point, Math.max(map.getZoom(), 13));
    }
  }, [latitude, longitude, ready]);

  const hasPoint = validCoordinates(latitude, longitude);
  const osmUrl = hasPoint
    ? openStreetMapUrl(latitude as number, longitude as number)
    : null;

  return (
    <div className={styles.mapWrap}>
      <div
        ref={containerRef}
        className={styles.map}
        role="region"
        aria-label={label}
        aria-describedby="company-map-help"
      />
      {!ready && !loadError && <div className={styles.mapLoading}>Loading map…</div>}
      {loadError && (
        <div className={styles.mapFallback} role="status">
          The map could not load. Enter coordinates manually below.
        </div>
      )}
      <div className={styles.mapHint} id="company-map-help">
        <span>
          {hasPoint
            ? "Click the map or drag the marker to adjust the pin."
            : "Click the map to set a location. You can also enter coordinates manually."}
        </span>
        {osmUrl && (
          <a href={osmUrl} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>
            View on OpenStreetMap
          </a>
        )}
      </div>
    </div>
  );
}

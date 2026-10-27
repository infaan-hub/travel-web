"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { openStreetMapUrl } from "@/lib/company-domain";
import {
  ZANZIBAR_BOUNDS,
  ZANZIBAR_CENTER,
  ZANZIBAR_PLACES,
  isInZanzibar,
} from "@/lib/zanzibar";
import styles from "@/features/pages/admin-companies.module.css";

export { ZANZIBAR_BOUNDS, ZANZIBAR_CENTER, ZANZIBAR_PLACES, isInZanzibar };

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
  disabled?: boolean;
  label?: string;
  showPlaces?: boolean;
};

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

function placeDotStyle(type: string) {
  switch (type) {
    case "region":
      return { radius: 9, color: "#0F6B6B", fillColor: "#0F6B6B", fillOpacity: 0.12, weight: 2 };
    case "district":
      return { radius: 7, color: "#0F6B6B", fillColor: "#0F6B6B", fillOpacity: 0.18, weight: 1.5 };
    case "island":
      return { radius: 4.5, color: "#0369A1", fillColor: "#38BDF8", fillOpacity: 0.7, weight: 1 };
    case "neighbourhood":
      return { radius: 3.2, color: "#B45309", fillColor: "#F59E0B", fillOpacity: 0.72, weight: 1 };
    case "locality":
      return { radius: 3, color: "#7C3AED", fillColor: "#A78BFA", fillOpacity: 0.7, weight: 1 };
    default:
      return { radius: 2.2, color: "#0F766E", fillColor: "#14B8A6", fillOpacity: 0.65, weight: 0.5 };
  }
}

function townIcon(leaflet: typeof Leaflet, size: number) {
  return leaflet.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:#0F6B6B;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  disabled = false,
  label = "Company location map",
  showPlaces = true,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const placesLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const villagesLayerRef = useRef<Leaflet.LayerGroup | null>(null);
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
          center: hasPoint ? [latitude as number, longitude as number] : ZANZIBAR_CENTER,
          zoom: hasPoint ? 13 : 9,
          scrollWheelZoom: false,
          maxBounds: ZANZIBAR_BOUNDS,
          maxBoundsViscosity: 1.0,
          minZoom: 8,
        });
        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          })
          .addTo(map);

        // Every Zanzibar place is available on the map. Villages are drawn as
        // lightweight canvas dots and appear once the user zooms in, while
        // towns and administrative centres stay visible at the island scale.
        if (showPlaces) {
          const renderer = leaflet.canvas({ padding: 0.5 });
          const placesLayer = leaflet.layerGroup().addTo(map);
          const villagesLayer = leaflet.layerGroup();
          const addPlace = (place: (typeof ZANZIBAR_PLACES)[number]) => {
            const isVillage = place.type === "village" || place.type === "locality";
            const layer = isVillage ? villagesLayer : placesLayer;
            const tooltip = `${place.name} (${place.type})`;

            if (place.type === "city" || place.type === "town") {
              const marker = leaflet
                .marker([place.latitude, place.longitude], {
                  title: place.name,
                  alt: place.name,
                  icon: townIcon(leaflet, place.type === "city" ? 16 : 13),
                })
                .bindTooltip(tooltip, { direction: "top", offset: [0, -8] })
                .on("click", () => {
                  if (!disabledRef.current) onChangeRef.current(place.latitude, place.longitude);
                });
              marker.addTo(layer);
              return;
            }

            const dot = leaflet
              .circleMarker([place.latitude, place.longitude], {
                ...placeDotStyle(place.type),
                renderer,
              })
              .bindTooltip(tooltip, { direction: "top", offset: [0, -4] })
              .on("click", () => {
                if (!disabledRef.current) onChangeRef.current(place.latitude, place.longitude);
              });
            dot.addTo(layer);
          };

          for (const place of ZANZIBAR_PLACES) addPlace(place);

          const updateVillages = () => {
            if (map.getZoom() >= 11) {
              if (!map.hasLayer(villagesLayer)) villagesLayer.addTo(map);
            } else if (map.hasLayer(villagesLayer)) {
              map.removeLayer(villagesLayer);
            }
          };
          updateVillages();
          map.on("zoomend", updateVillages);

          placesLayerRef.current = placesLayer;
          villagesLayerRef.current = villagesLayer;
        }

        map.on("click", (event: Leaflet.LeafletMouseEvent) => {
          if (disabledRef.current) return;
          const lat = Math.round(event.latlng.lat * 1_000_000) / 1_000_000;
          const lng = Math.round(event.latlng.lng * 1_000_000) / 1_000_000;
          // Keep locations inside Zanzibar only.
          if (!isInZanzibar(lat, lng)) return;
          onChangeRef.current(lat, lng);
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
      placesLayerRef.current = null;
      villagesLayerRef.current = null;
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
        const lat = Math.round(next.lat * 1_000_000) / 1_000_000;
        const lng = Math.round(next.lng * 1_000_000) / 1_000_000;
        if (!isInZanzibar(lat, lng)) return;
        onChangeRef.current(lat, lng);
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
            ? "Click the map, a town dot, or drag the marker to adjust the pin."
            : "Click the map or a town dot to set a location. Village dots appear as you zoom in."}
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

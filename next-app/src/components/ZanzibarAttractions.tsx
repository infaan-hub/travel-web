"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ZANZIBAR_BOUNDS,
  ZANZIBAR_CENTER,
  isInZanzibar,
} from "@/lib/zanzibar";
import {
  TRIP_PLACE_GROUPS,
  tripPlaceMapsUrl,
  tripPlacesForGroup,
  type TripPlace,
  type TripPlaceCategory,
  type TripPlaceGroupId,
} from "@/lib/trips";
import styles from "@/components/zanzibar-attractions.module.css";

const CATEGORY_COLORS: Record<TripPlaceCategory, string> = {
  Attraction: "#0f6b6b",
  "Beach / Sandbank": "#0284c7",
  "Wildlife / Turtles": "#16a34a",
  "Spice Farm": "#b45309",
  "Tour / Activity": "#7c3aed",
  "Kitesurf School": "#0891b2",
  Restaurant: "#dc2626",
  Cafe: "#d97706",
  Bar: "#9333ea",
  Hotel: "#1d4ed8",
  "Shop / Market": "#db2777",
  "Spa / Wellness": "#a855f7",
  Transport: "#475569",
  "Health / Pharmacy": "#ef4444",
};

const GROUP_COUNTS = new Map<TripPlaceGroupId, number>(
  TRIP_PLACE_GROUPS.map((group) => [group.id, tripPlacesForGroup(group.id).length]),
);

function ratingLabel(place: TripPlace) {
  if (place.rating === null) return "Not rated";
  return `${place.rating.toFixed(1)} / 5 · ${place.reviews.toLocaleString("en-US")} reviews`;
}

function tripPlacePopup(place: TripPlace) {
  const root = document.createElement("div");
  root.className = styles.popup;

  const category = document.createElement("span");
  category.className = styles.popupCategory;
  category.textContent = place.category;
  category.style.setProperty("--popup-accent", CATEGORY_COLORS[place.category]);

  const title = document.createElement("strong");
  title.className = styles.popupTitle;
  title.textContent = place.name;

  const area = document.createElement("span");
  area.className = styles.popupArea;
  area.textContent = place.area;

  const meta = document.createElement("span");
  meta.className = styles.popupMeta;
  meta.textContent = ratingLabel(place);

  const link = document.createElement("a");
  link.className = styles.popupLink;
  link.href = tripPlaceMapsUrl(place);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open in Google Maps";

  root.append(category, title, area, meta, link);
  return root;
}

function markerRadius(place: TripPlace) {
  if (place.category === "Attraction") return 7;
  if (place.category === "Beach / Sandbank" || place.category === "Wildlife / Turtles") return 6;
  return 5;
}

export default function ZanzibarAttractions() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const markersRef = useRef<Map<number, Leaflet.CircleMarker>>(new Map());
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [group, setGroup] = useState<TripPlaceGroupId>("attractions");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const places = useMemo(
    () =>
      tripPlacesForGroup(group).filter((place) =>
        isInZanzibar(place.latitude, place.longitude),
      ),
    [group],
  );

  const selectedPlace = places.find((place) => place.id === selectedId) ?? null;

  const topPlaces = useMemo(
    () =>
      [...places]
        .sort((a, b) => {
          const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
          if (ratingDiff !== 0) return ratingDiff;
          return b.reviews - a.reviews;
        })
        .slice(0, 8),
    [places],
  );

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    const markers = markersRef.current;
    if (!container) return;

    void import("leaflet")
      .then((leaflet) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = leaflet.map(containerRef.current, {
          center: ZANZIBAR_CENTER,
          zoom: 9,
          minZoom: 8,
          maxBounds: ZANZIBAR_BOUNDS,
          maxBoundsViscosity: 1,
          scrollWheelZoom: false,
        });
        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          })
          .addTo(map);
        mapRef.current = map;
        leafletRef.current = leaflet;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setMapError(true);
      });

    return () => {
      cancelled = true;
      markers.clear();
      layerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !ready) return;

    layerRef.current?.remove();
    markersRef.current.clear();

    const layer = leaflet.layerGroup().addTo(map);
    const renderer = leaflet.canvas({ padding: 0.5 });

    for (const place of places) {
      const marker = leaflet
        .circleMarker([place.latitude, place.longitude], {
          radius: markerRadius(place),
          color: "#ffffff",
          weight: 1.5,
          fillColor: CATEGORY_COLORS[place.category],
          fillOpacity: 0.94,
          renderer,
        })
        .bindTooltip(`${place.name} · ${place.category}`, {
          direction: "top",
          offset: [0, -6],
        })
        .bindPopup(tripPlacePopup(place), {
          maxWidth: 280,
          autoPanPadding: [24, 24],
        })
        .on("click", () => setSelectedId(place.id));
      marker.addTo(layer);
      markersRef.current.set(place.id, marker);
    }

    layerRef.current = layer;

    if (places.length > 0) {
      const bounds = leaflet.latLngBounds(
        places.map((place) => [place.latitude, place.longitude] as [number, number]),
      );
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12, animate: false });
    } else {
      map.setView(ZANZIBAR_CENTER, 9);
    }
  }, [places, ready]);

  const selectPlace = (place: TripPlace, focus: boolean) => {
    setSelectedId(place.id);
    if (!focus) return;
    const map = mapRef.current;
    const marker = markersRef.current.get(place.id);
    if (!map || !marker) return;
    map.flyTo([place.latitude, place.longitude], Math.max(map.getZoom(), 13), {
      duration: 0.5,
    });
    marker.openPopup();
  };

  const changeGroup = (next: TripPlaceGroupId) => {
    setGroup(next);
    setSelectedId(null);
  };

  return (
    <section className={styles.section} id="zanzibar-attractions" aria-labelledby="zanzibar-attractions-title">
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>Explore</p>
          <h2 className={styles.title} id="zanzibar-attractions-title">
            Zanzibar attractions &amp; places
          </h2>
          <p className={styles.lead}>
            Tourist attractions, beaches, restaurants and stays from Google Maps search
            data, each pinned with its real Zanzibar coordinates.
          </p>
        </div>
        <span className={styles.count}>{places.length} places</span>
      </div>

      <div className={styles.filters} role="tablist" aria-label="Place categories">
        {TRIP_PLACE_GROUPS.map((item) => {
          const active = item.id === group;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.filterButton} ${active ? styles.filterActive : ""}`}
              onClick={() => changeGroup(item.id)}
              title={item.description}
            >
              <span>{item.label}</span>
              <span className={styles.filterCount}>{GROUP_COUNTS.get(item.id) ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.layout}>
        <div className={styles.mapCard}>
          <div
            ref={containerRef}
            className={styles.map}
            role="region"
            aria-label="Map of Zanzibar attractions and places"
          />
          {!ready && !mapError && (
            <div className={styles.mapStatus}>Loading Zanzibar map…</div>
          )}
          {mapError && (
            <div className={styles.mapStatus} role="status">
              The map could not load. Use the top-rated list to explore places.
            </div>
          )}
          <div className={styles.legend} aria-hidden="true">
            {[
              "Attraction",
              "Beach / Sandbank",
              "Wildlife / Turtles",
              "Spice Farm",
            ].map((category) => (
              <span key={category} className={styles.legendItem}>
                <i
                  className={styles.legendDot}
                  style={{
                    background: CATEGORY_COLORS[category as TripPlaceCategory],
                  }}
                />
                {category}
              </span>
            ))}
          </div>
        </div>

        <aside className={styles.aside} aria-label="Featured attractions">
          {selectedPlace ? (
            <div className={styles.selectedCard}>
              <span
                className={styles.categoryPill}
                style={{
                  background: `${CATEGORY_COLORS[selectedPlace.category]}18`,
                  color: CATEGORY_COLORS[selectedPlace.category],
                }}
              >
                {selectedPlace.category}
              </span>
              <h3 className={styles.selectedName}>{selectedPlace.name}</h3>
              <p className={styles.selectedArea}>{selectedPlace.area}</p>
              <p className={styles.selectedMeta}>{ratingLabel(selectedPlace)}</p>
              <a
                className={styles.mapsLink}
                href={tripPlaceMapsUrl(selectedPlace)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Maps
              </a>
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <span className={styles.emptyIcon} aria-hidden="true">
                ◎
              </span>
              <p>Select a marker or a place below to see its coordinates and details.</p>
            </div>
          )}

          <div>
            <h3 className={styles.listTitle}>Top rated</h3>
            <ul className={styles.topList}>
              {topPlaces.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    className={`${styles.topButton} ${
                      selectedPlace?.id === place.id ? styles.topButtonActive : ""
                    }`}
                    onClick={() => selectPlace(place, true)}
                  >
                    <span className={styles.topName}>{place.name}</span>
                    <span className={styles.topRating}>
                      {place.rating === null ? "—" : `${place.rating.toFixed(1)} ★`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

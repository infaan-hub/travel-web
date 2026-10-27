"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink, Locate, MapPin, Search, X } from "@/components/icons";
import {
  TRIP_PLACE_GROUPS,
  ZANZIBAR_TRIP_PLACES,
  tripPlaceMapsUrl,
  tripPlacesForGroup,
  type TripPlace,
  type TripPlaceCategory,
  type TripPlaceGroupId,
} from "@/lib/trips";
import {
  ZANZIBAR_BOUNDS,
  ZANZIBAR_CENTER,
  isInZanzibar,
} from "@/lib/zanzibar";
import styles from "@/components/trip-place-picker.module.css";

type PlaceGroupId = Exclude<TripPlaceGroupId, "all">;

const GROUP_COLORS: Record<PlaceGroupId, string> = {
  attractions: "#0f6b6b",
  activities: "#7c3aed",
  food: "#dc2626",
  stays: "#1d4ed8",
  shopping: "#db2777",
  wellness: "#a855f7",
  services: "#475569",
};

const GROUP_COUNTS = new Map<TripPlaceGroupId, number>(
  TRIP_PLACE_GROUPS.map((group) => [group.id, tripPlacesForGroup(group.id).length]),
);

const CATEGORY_GROUP = new Map<TripPlaceCategory, PlaceGroupId>();
for (const group of TRIP_PLACE_GROUPS) {
  if (group.id === "all") continue;
  for (const category of group.categories) {
    CATEGORY_GROUP.set(category, group.id as PlaceGroupId);
  }
}

const PLACE_BY_ID = new Map(ZANZIBAR_TRIP_PLACES.map((place) => [place.id, place]));

const LEGEND_GROUPS = TRIP_PLACE_GROUPS.filter(
  (group): group is (typeof TRIP_PLACE_GROUPS)[number] & { id: PlaceGroupId } =>
    group.id !== "all",
);

function markerColor(category: TripPlaceCategory) {
  return GROUP_COLORS[CATEGORY_GROUP.get(category) ?? "attractions"];
}

function roundCoordinate(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function validPoint(latitude: number | null, longitude: number | null) {
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

function pointMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function ratingLabel(place: TripPlace) {
  if (place.rating === null) return "Not rated";
  return `${place.rating.toFixed(1)} / 5 · ${place.reviews.toLocaleString("en-US")} reviews`;
}

type TripPlaceMapPickerProps = {
  latitude: number | null;
  longitude: number | null;
  disabled?: boolean;
  onSelectPlace: (place: TripPlace) => void;
  onPickPoint: (latitude: number, longitude: number) => void;
  onClearPoint: () => void;
};

export default function TripPlaceMapPicker({
  latitude,
  longitude,
  disabled = false,
  onSelectPlace,
  onPickPoint,
  onClearPoint,
}: TripPlaceMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const rendererRef = useRef<Leaflet.Canvas | null>(null);
  const markersRef = useRef<Map<number, Leaflet.CircleMarker>>(new Map());
  const pinRef = useRef<Leaflet.Marker | null>(null);
  const lastPointRef = useRef<[number, number] | null>(null);
  const disabledRef = useRef(disabled);
  const onSelectRef = useRef<(place: TripPlace) => void>(() => {});
  const onPickRef = useRef<(lat: number, lng: number) => void>(() => {});

  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [group, setGroup] = useState<TripPlaceGroupId>("all");
  const [query, setQuery] = useState("");

  const hasPoint = validPoint(latitude, longitude);

  const selectedPlace = useMemo(() => {
    if (!hasPoint) return null;
    return (
      ZANZIBAR_TRIP_PLACES.find(
        (place) =>
          Math.abs(place.latitude - (latitude as number)) < 1e-5 &&
          Math.abs(place.longitude - (longitude as number)) < 1e-5,
      ) ?? null
    );
  }, [hasPoint, latitude, longitude]);

  const filteredPlaces = useMemo(() => {
    const rows =
      group === "all" ? ZANZIBAR_TRIP_PLACES : tripPlacesForGroup(group);
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (place) =>
        place.name.toLowerCase().includes(needle) ||
        place.area.toLowerCase().includes(needle) ||
        place.category.toLowerCase().includes(needle),
    );
  }, [group, query]);

  const legendGroups =
    group === "all"
      ? LEGEND_GROUPS
      : LEGEND_GROUPS.filter((item) => item.id === group);

  useEffect(() => {
    onSelectRef.current = (place) => {
      onSelectPlace(place);
      setQuery("");
      const map = mapRef.current;
      if (map) {
        map.flyTo(
          [place.latitude, place.longitude],
          Math.max(map.getZoom(), 13),
          { duration: 0.45 },
        );
      }
    };
    onPickRef.current = onPickPoint;
    disabledRef.current = disabled;
  }, [disabled, onPickPoint, onSelectPlace]);

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
          maxZoom: 18,
          zoomSnap: 0.25,
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

        map.on("click", (event: Leaflet.LeafletMouseEvent) => {
          if (disabledRef.current) return;
          const lat = roundCoordinate(event.latlng.lat);
          const lng = roundCoordinate(event.latlng.lng);
          // Every pin must stay on Zanzibar land, not just inside the viewport.
          if (!isInZanzibar(lat, lng)) return;
          onPickRef.current(lat, lng);
        });

        rendererRef.current = leaflet.canvas({ padding: 0.5 });
        leafletRef.current = leaflet;
        mapRef.current = map;
        setReady(true);
        window.requestAnimationFrame(() => map.invalidateSize());
      })
      .catch(() => {
        if (!cancelled) setMapError(true);
      });

    return () => {
      cancelled = true;
      markers.clear();
      pinRef.current = null;
      layerRef.current = null;
      rendererRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  const fitGroup = useCallback(
    (animate: boolean) => {
      const map = mapRef.current;
      const leaflet = leafletRef.current;
      if (!map || !leaflet) return;
      const places =
        group === "all" ? ZANZIBAR_TRIP_PLACES : tripPlacesForGroup(group);
      if (places.length === 0) return;
      const bounds = leaflet.latLngBounds(
        places.map(
          (place) => [place.latitude, place.longitude] as [number, number],
        ),
      );
      map.invalidateSize();
      map.fitBounds(bounds, {
        padding: [24, 24],
        maxZoom: 11,
        animate,
      });
    },
    [group],
  );

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    const renderer = rendererRef.current;
    if (!map || !leaflet || !ready) return;

    layerRef.current?.remove();
    markersRef.current.clear();

    const layer = leaflet.layerGroup().addTo(map);

    for (const place of filteredPlaces) {
      const marker = leaflet
        .circleMarker([place.latitude, place.longitude], {
          radius: 5,
          color: "#ffffff",
          weight: 1.2,
          fillColor: markerColor(place.category),
          fillOpacity: 0.9,
          bubblingMouseEvents: false,
          renderer: renderer ?? undefined,
        })
        .bindTooltip(`${place.name} · ${place.area}`, {
          direction: "top",
          offset: [0, -4],
          opacity: 0.95,
        })
        .on("click", () => onSelectRef.current(place));

      marker.addTo(layer);
      markersRef.current.set(place.id, marker);
    }

    layerRef.current = layer;
  }, [filteredPlaces, ready]);

  useEffect(() => {
    if (!ready) return;
    fitGroup(false);
  }, [fitGroup, ready]);

  useEffect(() => {
    if (!ready) return;
    const selectedId = selectedPlace?.id ?? null;

    markersRef.current.forEach((marker, id) => {
      const place = PLACE_BY_ID.get(id);
      if (!place) return;
      if (id === selectedId) {
        marker.setStyle({
          radius: 8,
          color: "#ffffff",
          weight: 3,
          fillColor: "#063a78",
          fillOpacity: 1,
        });
        marker.bringToFront();
      } else {
        marker.setStyle({
          radius: 5,
          color: "#ffffff",
          weight: 1.2,
          fillColor: markerColor(place.category),
          fillOpacity: 0.9,
        });
      }
    });
  }, [filteredPlaces, ready, selectedPlace]);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !ready) return;
    if (!hasPoint) {
      pinRef.current?.remove();
      pinRef.current = null;
      lastPointRef.current = null;
      return;
    }

    const point: [number, number] = [latitude as number, longitude as number];
    lastPointRef.current = point;

    if (!pinRef.current) {
      const pin = leaflet
        .marker(point, {
          draggable: !disabled,
          autoPan: true,
          zIndexOffset: 1000,
          icon: leaflet.divIcon({
            className: "",
            html:
              '<span style="display:block;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#08428c;border:3px solid #fff;box-shadow:0 3px 10px rgba(8,66,140,.45)"></span>',
            iconSize: [26, 26],
            iconAnchor: [13, 26],
          }),
        })
        .addTo(map);

      pin.on("dragend", () => {
        const next = pin.getLatLng();
        const lat = roundCoordinate(next.lat);
        const lng = roundCoordinate(next.lng);
        if (!isInZanzibar(lat, lng)) {
          if (lastPointRef.current) pin.setLatLng(lastPointRef.current);
          return;
        }
        onPickRef.current(lat, lng);
      });

      pinRef.current = pin;
    } else {
      pinRef.current.setLatLng(point);
    }

    if (disabled) pinRef.current.dragging?.disable();
    else pinRef.current.dragging?.enable();

    if (!map.getBounds().contains(point)) {
      map.panTo(point);
    } else if (map.getZoom() < 10) {
      map.setView(point, 12, { animate: false });
    }
  }, [disabled, hasPoint, latitude, longitude, ready]);

  const handleClear = useCallback(() => {
    setQuery("");
    onClearPoint();
  }, [onClearPoint]);

  return (
    <div className={styles.picker}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden="true">
            <Search size={15} />
          </span>
          <label className={styles.srOnly} htmlFor="trip-map-search">
            Search Zanzibar places
          </label>
          <input
            id="trip-map-search"
            className={styles.searchInput}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // Searching must never submit the trip form.
              if (event.key === "Enter") event.preventDefault();
            }}
            placeholder={`Search all ${ZANZIBAR_TRIP_PLACES.length} places by name, area or category…`}
            autoComplete="off"
            disabled={disabled}
          />
          {query ? (
            <button
              className={styles.searchClear}
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear place search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <label className={styles.groupSelect}>
          <span className={styles.groupLabel}>Show</span>
          <select
            className={styles.select}
            value={group}
            onChange={(event) =>
              setGroup(event.target.value as TripPlaceGroupId)
            }
            disabled={disabled}
          >
            {TRIP_PLACE_GROUPS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} ({GROUP_COUNTS.get(item.id) ?? 0})
              </option>
            ))}
          </select>
        </label>

        <span className={styles.count}>
          <MapPin size={13} aria-hidden="true" />
          {filteredPlaces.length} mapped
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.mapWrap}>
          <div
            ref={containerRef}
            className={styles.map}
            role="region"
            aria-label="Map of Zanzibar places with their coordinates"
          />
          {!ready && !mapError ? (
            <div className={styles.mapStatus}>Loading Zanzibar map…</div>
          ) : null}
          {mapError ? (
            <div className={styles.mapStatus} role="status">
              The map could not load. Pick a place from the list instead.
            </div>
          ) : null}
          {ready ? (
            <div className={styles.legend} aria-hidden="true">
              {legendGroups.map((item) => (
                <span key={item.id} className={styles.legendItem}>
                  <i
                    className={styles.legendDot}
                    style={{ background: GROUP_COLORS[item.id as PlaceGroupId] }}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <aside className={styles.side} aria-label="Zanzibar place list">
          <div className={styles.selection}>
            {selectedPlace ? (
              <>
                <span
                  className={styles.pill}
                  style={{
                    background: `${markerColor(selectedPlace.category)}16`,
                    color: markerColor(selectedPlace.category),
                  }}
                >
                  {selectedPlace.category}
                </span>
                <span className={styles.selectionName}>
                  {selectedPlace.name}
                </span>
                <span className={styles.selectionMeta}>
                  {selectedPlace.area} · {ratingLabel(selectedPlace)}
                </span>
              </>
            ) : hasPoint ? (
              <>
                <span className={styles.pill}>Custom pin</span>
                <span className={styles.selectionName}>
                  Custom map location
                </span>
                <span className={styles.selectionMeta}>
                  Pick a place below to use its name.
                </span>
              </>
            ) : (
              <span className={styles.hint}>
                Pick a place to fill the trip location and its coordinates, or
                click the map to drop a custom pin.
              </span>
            )}

            {hasPoint ? (
              <span className={styles.coords}>
                <span className={styles.coord}>
                  <em>Lat</em> {(latitude as number).toFixed(6)}
                </span>
                <span className={styles.coord}>
                  <em>Lng</em> {(longitude as number).toFixed(6)}
                </span>
              </span>
            ) : null}

            {hasPoint ? (
              <span className={styles.actions}>
                <a
                  className={styles.mapsLink}
                  href={
                    selectedPlace
                      ? tripPlaceMapsUrl(selectedPlace)
                      : pointMapsUrl(latitude as number, longitude as number)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={14} /> Open in Google Maps
                </a>
                <button
                  className={styles.clear}
                  type="button"
                  onClick={handleClear}
                  disabled={disabled}
                >
                  <X size={14} /> Clear pin
                </button>
              </span>
            ) : null}
          </div>

          <div className={styles.listHead}>
            <span className={styles.listTitle}>
              {filteredPlaces.length} place
              {filteredPlaces.length === 1 ? "" : "s"}
              {query.trim() ? ` for “${query.trim()}”` : ""}
            </span>
            <button
              className={styles.fitButton}
              type="button"
              onClick={() => fitGroup(true)}
              disabled={!ready || disabled}
            >
              <Locate size={13} /> Fit Zanzibar
            </button>
          </div>

          <div className={styles.list}>
            {filteredPlaces.length > 0 ? (
              <ul className={styles.listItems}>
                {filteredPlaces.map((place) => {
                  const active = selectedPlace?.id === place.id;
                  return (
                    <li key={place.id}>
                      <button
                        className={`${styles.placeButton} ${
                          active ? styles.placeButtonActive : ""
                        }`}
                        type="button"
                        onClick={() => {
                          if (disabled) return;
                          onSelectRef.current(place);
                        }}
                        disabled={disabled}
                        aria-pressed={active}
                      >
                        <span
                          className={styles.placeDot}
                          style={{ background: markerColor(place.category) }}
                          aria-hidden="true"
                        />
                        <span className={styles.placeMain}>
                          <span className={styles.placeName}>{place.name}</span>
                          <span className={styles.placeMeta}>
                            {place.area} · {place.category}
                          </span>
                        </span>
                        <span className={styles.placeCoords}>
                          {place.latitude.toFixed(5)},{" "}
                          {place.longitude.toFixed(5)}
                        </span>
                        <span className={styles.placeRating}>
                          {place.rating === null
                            ? "—"
                            : `${place.rating.toFixed(1)} ★`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.listEmpty}>
                No place matches “{query.trim()}”.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

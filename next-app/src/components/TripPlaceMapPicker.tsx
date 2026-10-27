"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { KeyRoundIcon, Location01Icon } from "@hugeicons/core-free-icons";
import {
  ExternalLink,
  KeyRound,
  Locate,
  Location01,
  MapPin,
  Navigation,
  Search,
  X,
} from "@/components/icons";
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
  formatDistanceKm,
  describeGeoPoint,
  type GeoContext,
} from "@/lib/geo-context";
import {
  ZANZIBAR_BOUNDS,
  ZANZIBAR_CENTER,
  isInZanzibar,
} from "@/lib/zanzibar";
import {
  ZANZIBAR_ARCHIPELAGO_BOUNDS,
  ZANZIBAR_ISLAND_LABELS,
  ZANZIBAR_ISLANDS,
} from "@/lib/zanzibar-outline";
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

const CATEGORY_NOTES: Record<TripPlaceCategory, string> = {
  Attraction: "Landmark, heritage site or viewpoint worth a stop.",
  Bar: "Drinks, music and an easy evening atmosphere.",
  "Beach / Sandbank": "Sand, swimming and Indian Ocean views.",
  Cafe: "Coffee, snacks and a relaxed pause.",
  "Health / Pharmacy": "Medical help and everyday supplies.",
  Hotel: "A place to check in and stay overnight.",
  "Kitesurf School": "Kitesurf lessons and water-sports gear.",
  Restaurant: "Local or international food and drink.",
  "Shop / Market": "Souvenirs, spices and local shopping.",
  "Spa / Wellness": "Treatments, massage and relaxation.",
  "Spice Farm": "Spice-growing tours, tastings and gardens.",
  "Tour / Activity": "A guided experience or excursion.",
  Transport: "Ferry, airport or local transport hub.",
  "Wildlife / Turtles": "Wildlife encounter and conservation site.",
};

const PLACE_BY_ID = new Map(ZANZIBAR_TRIP_PLACES.map((place) => [place.id, place]));

const LEGEND_GROUPS = TRIP_PLACE_GROUPS.filter(
  (group): group is (typeof TRIP_PLACE_GROUPS)[number] & { id: PlaceGroupId } =>
    group.id !== "all",
);

const MINOR_ROAD_ZOOM = 12;
const ROAD_ATTRIBUTION =
  'Road overlay © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors (ODbL)';

const ROUTE_START_COLOR = "#15803d";
const ROUTE_END_COLOR = "#0f172a";
const ROUTE_GREEN = "#16a34a";
const ROUTE_CASING = "#064e3b";

const HUGEICON_PATHS = {
  location: Location01Icon,
  key: KeyRoundIcon,
} as const;

type IconSvgObject = readonly (readonly [
  string,
  Readonly<Record<string, string | number>>,
])[];

type RouteEndpoint = {
  lat: number;
  lng: number;
  label: string;
};

type RouteSource = "osrm" | "estimate";

type RouteResult = {
  distanceKm: number;
  durationMins: number;
  geometry: [number, number][];
  source: RouteSource;
};

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

function starString(rating: number | null) {
  if (rating === null) return "";
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

function uniqueJoin(values: (string | null | undefined)[]) {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const value of values) {
    const part = value?.trim();
    if (!part || seen.has(part)) continue;
    seen.add(part);
    parts.push(part);
  }
  return parts.join(" · ");
}

function nearestSummary(context: GeoContext | null) {
  const nearest = context?.nearest;
  if (!nearest) return "";
  if (nearest.distanceKm < 0.12) return `At ${nearest.name}`;
  return `${nearest.name} · ${formatDistanceKm(nearest.distanceKm)}`;
}

function formatRouteKm(value: number) {
  if (!Number.isFinite(value)) return "0.0";
  return value >= 100 ? Math.round(value).toString() : value.toFixed(1);
}

function formatDriveTime(minutes: number) {
  const safe = Math.max(1, Math.round(minutes));
  if (safe < 60) return `${safe} min`;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function iconPathMarkup(
  icon: IconSvgObject,
  stroke: string,
  strokeWidth: number,
) {
  return icon
    .map(([tag, attributes]) => {
      const parts = [`stroke="${stroke}"`, `stroke-width="${strokeWidth}"`];
      for (const [key, value] of Object.entries(attributes)) {
        if (key === "key" || key === "stroke" || key === "strokeWidth") continue;
        const attribute = key.replace(
          /[A-Z]/g,
          (letter) => `-${letter.toLowerCase()}`,
        );
        parts.push(`${attribute}="${value}"`);
      }
      return `<${tag} ${parts.join(" ")} />`;
    })
    .join("");
}

function locationGlyphMarkup(color: string, size: number) {
  // A tight white halo keeps the pin legible over the dark road overlay
  // without washing out the category colour.
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    ${iconPathMarkup(HUGEICON_PATHS.location, "#ffffff", 3.2)}
    ${iconPathMarkup(HUGEICON_PATHS.location, color, 2.4)}
  </svg>`;
}

function placeMarkerHtml(place: TripPlace) {
  const color = markerColor(place.category);
  const isStay = place.category === "Hotel";
  if (isStay) {
    return `<span class="${styles.placeMarkerGlyph} ${styles.placeMarkerStay}" style="--marker-color:${color}">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPathMarkup(HUGEICON_PATHS.key, color, 2)}</svg>
    </span>`;
  }
  return `<span class="${styles.placeMarkerGlyph}" style="--marker-color:${color}">${locationGlyphMarkup(color, 28)}</span>`;
}

function customPinHtml() {
  return `<span class="${styles.customPinGlyph}">${locationGlyphMarkup("#08428c", 34)}</span>`;
}

function routeBadgeHtml(label: "A" | "B") {
  const color = label === "A" ? ROUTE_START_COLOR : ROUTE_END_COLOR;
  return `<span class="${styles.routeBadge}" style="--route-badge:${color}">${label}</span>`;
}

function pointCardHtml(place: TripPlace) {
  const color = markerColor(place.category);
  const context = describeGeoPoint(place.latitude, place.longitude);
  const group = TRIP_PLACE_GROUPS.find(
    (item) => item.id === CATEGORY_GROUP.get(place.category),
  );
  const nearest = nearestSummary(context) || context.region || "Zanzibar";
  const stars = starString(place.rating);

  return `<div class="${styles.pointCard}" style="--marker-color:${color}">
    <div class="${styles.pointCardHead}">
      <span class="${styles.pointCardGroup}">${escapeHtml(group?.label ?? "Place")}</span>
      <span class="${styles.pointCardCategory}">${escapeHtml(place.category)}</span>
    </div>
    <strong class="${styles.pointCardName}">${escapeHtml(place.name)}</strong>
    <span class="${styles.pointCardArea}">${escapeHtml(uniqueJoin([place.area, context.region]))}</span>
    <span class="${styles.pointCardRating}">
      <span class="${styles.pointCardStars}" aria-hidden="true">${stars || "Not rated"}</span>
      ${place.rating === null ? "" : `<strong>${place.rating.toFixed(1)}</strong>`}
      <span>${place.reviews.toLocaleString("en-US")} reviews</span>
    </span>
    <p class="${styles.pointCardNote}">${escapeHtml(CATEGORY_NOTES[place.category])}</p>
    <dl class="${styles.pointCardFacts}">
      <div><dt>Nearest</dt><dd>${escapeHtml(nearest)}</dd></div>
      <div><dt>Coordinates</dt><dd>${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}</dd></div>
    </dl>
    <a class="${styles.pointCardLink}" href="${tripPlaceMapsUrl(place)}" target="_blank" rel="noopener noreferrer">Open in Google Maps <span aria-hidden="true">↗</span></a>
  </div>`;
}

function isRouteGeometry(value: unknown): value is [number, number][] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === "number" &&
        Number.isFinite(point[0]) &&
        point[0] >= -90 &&
        point[0] <= 90 &&
        typeof point[1] === "number" &&
        Number.isFinite(point[1]) &&
        point[1] >= -180 &&
        point[1] <= 180,
    )
  );
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
  const routeRendererRef = useRef<Leaflet.Canvas | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const markersRef = useRef<Map<number, Leaflet.Marker>>(new Map());
  const pinRef = useRef<Leaflet.Marker | null>(null);
  const lastPointRef = useRef<[number, number] | null>(null);
  const routeLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const initialFitRef = useRef(false);
  const disabledRef = useRef(disabled);
  const routeModeRef = useRef(false);
  const onSelectRef = useRef<(place: TripPlace) => void>(() => {});
  const onPickRef = useRef<(lat: number, lng: number) => void>(() => {});
  const addRoutePointRef = useRef<(point: RouteEndpoint) => void>(() => {});

  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [group, setGroup] = useState<TripPlaceGroupId>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"islands" | "places">("islands");
  const [routeMode, setRouteMode] = useState(false);
  const [routeStops, setRouteStops] = useState<RouteEndpoint[]>([]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeAttempt, setRouteAttempt] = useState(0);

  const routeLoading =
    routeMode &&
    routeStops.length === 2 &&
    route === null &&
    routeError === null;

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

  const pointContext = useMemo(
    () =>
      hasPoint
        ? describeGeoPoint(latitude as number, longitude as number)
        : null,
    [hasPoint, latitude, longitude],
  );

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

  const addRoutePoint = useCallback((point: RouteEndpoint) => {
    setRoute(null);
    setRouteError(null);
    setRouteStops((stops) =>
      stops.length >= 2 ? [point] : [...stops, point],
    );
  }, []);

  const exitRouteMode = useCallback(() => {
    setRouteMode(false);
    setRouteStops([]);
    setRoute(null);
    setRouteError(null);
  }, []);

  const resetRoute = useCallback(() => {
    setRouteStops([]);
    setRoute(null);
    setRouteError(null);
  }, []);

  const swapRouteStops = useCallback(() => {
    setRoute(null);
    setRouteError(null);
    setRouteStops((stops) =>
      stops.length === 2 ? [stops[1], stops[0]] : stops,
    );
  }, []);

  const startRouteFrom = useCallback((lat: number, lng: number, label: string) => {
    if (disabledRef.current) return;
    setRouteMode(true);
    setRouteStops([{ lat, lng, label }]);
    setRoute(null);
    setRouteError(null);
  }, []);

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
    routeModeRef.current = routeMode;
    addRoutePointRef.current = addRoutePoint;
  }, [addRoutePoint, routeMode]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    const markers = markersRef.current;
    if (!container) return;

    const roadsController = new AbortController();

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

        // Custom overlays use their own panes so the drawing order is fixed:
        // islands, then roads, then the route, then the markers.
        const roadsPane = map.createPane("trip-roads");
        roadsPane.style.zIndex = "410";
        roadsPane.style.pointerEvents = "none";
        const routePane = map.createPane("trip-route");
        routePane.style.zIndex = "430";
        routePane.style.pointerEvents = "none";

        const roadsRenderer = leaflet.canvas({ padding: 0.5, pane: "trip-roads" });
        const routeRenderer = leaflet.canvas({ padding: 0.5, pane: "trip-route" });
        roadsRenderer.addTo(map);
        routeRenderer.addTo(map);
        routeRendererRef.current = routeRenderer;

        // Full Zanzibar land overlay above the OSM tiles and below the place
        // markers, so the whole archipelago reads as one map.
        const islandLayer = leaflet.layerGroup().addTo(map);
        for (const island of ZANZIBAR_ISLANDS) {
          leaflet
            .polygon(island.coordinates, {
              color: "#0b5f63",
              weight: island.name === "Islet" ? 1 : 1.8,
              opacity: 0.85,
              fillColor: "#0f766e",
              fillOpacity: 0.16,
              interactive: false,
              className: styles.islandShape,
            })
            .addTo(islandLayer);
        }
        const islandLabels: Leaflet.Marker[] = [];
        for (const label of ZANZIBAR_ISLAND_LABELS) {
          islandLabels.push(
            leaflet
              .marker(label.at, {
                interactive: false,
                keyboard: false,
                icon: leaflet.divIcon({
                  className: styles.islandLabel,
                  html: `<span>${label.name}</span>`,
                  iconSize: [120, 18],
                  iconAnchor: [60, 9],
                }),
              })
              .addTo(islandLayer),
          );
        }

        // Only the archipelago overview needs the big island names; once
        // zoomed in, OSM labels name the districts and the text crowds the
        // place markers.
        const syncIslandLabels = () => {
          const opacity = map.getZoom() < 9.5 ? 1 : 0;
          for (const label of islandLabels) label.setOpacity(opacity);
        };
        map.on("zoomend", syncIslandLabels);
        syncIslandLabels();

        // Main roads are always drawn. Minor streets load lazily and only
        // appear at neighbourhood zoom levels so the overview stays legible.
        let minorRoad: Leaflet.Polyline | null = null;
        let minorRoadLoading = false;

        const addMainRoads = async () => {
          try {
            const response = await fetch("/data/zanzibar-roads-main.json", {
              signal: roadsController.signal,
            });
            if (!response.ok || cancelled) return;
            const payload = (await response.json()) as {
              roads?: [number, number][][];
            };
            const roads = payload.roads ?? [];
            if (!roads.length || cancelled) return;
            leaflet
              .polyline(roads as Leaflet.LatLngExpression[][], {
                pane: "trip-roads",
                renderer: roadsRenderer,
                color: "#000000",
                weight: 5,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
                smoothFactor: 1.1,
              })
              .addTo(map);
            map.attributionControl.addAttribution(ROAD_ATTRIBUTION);
          } catch {
            // Roads are an enhancement; the OSM tiles still work without them.
          }
        };

        const syncMinorRoads = () => {
          if (map.getZoom() < MINOR_ROAD_ZOOM) {
            if (minorRoad && map.hasLayer(minorRoad)) map.removeLayer(minorRoad);
            return;
          }
          if (minorRoad) {
            if (!map.hasLayer(minorRoad)) minorRoad.addTo(map);
            return;
          }
          if (minorRoadLoading || cancelled) return;
          minorRoadLoading = true;
          void fetch("/data/zanzibar-roads-minor.json", {
            signal: roadsController.signal,
          })
            .then((response) => (response.ok ? response.json() : null))
            .then(
              (payload: { roads?: [number, number][][] } | null) => {
                if (cancelled || !payload?.roads?.length) return;
                minorRoad = leaflet.polyline(
                  payload.roads as Leaflet.LatLngExpression[][],
                  {
                    pane: "trip-roads",
                    renderer: roadsRenderer,
                    color: "#000000",
                    weight: 1.1,
                    opacity: 0.5,
                    lineCap: "round",
                    lineJoin: "round",
                    interactive: false,
                    smoothFactor: 1.2,
                  },
                );
                if (map.getZoom() >= MINOR_ROAD_ZOOM) minorRoad.addTo(map);
              },
            )
            .catch(() => {
              // No minor roads; main roads and the base map remain.
            })
            .finally(() => {
              minorRoadLoading = false;
            });
        };

        void addMainRoads();
        map.on("zoomend", syncMinorRoads);
        syncMinorRoads();

        map.on("click", (event: Leaflet.LeafletMouseEvent) => {
          if (disabledRef.current) return;
          const lat = roundCoordinate(event.latlng.lat);
          const lng = roundCoordinate(event.latlng.lng);
          // Every pin must stay on Zanzibar land, not just inside the viewport.
          if (!isInZanzibar(lat, lng)) return;
          if (routeModeRef.current) {
            const context = describeGeoPoint(lat, lng);
            const label =
              context.nearest && context.nearest.distanceKm <= 2
                ? `Near ${context.nearest.name}`
                : `Pin ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
            addRoutePointRef.current({ lat, lng, label });
            return;
          }
          onPickRef.current(lat, lng);
        });

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
      roadsController.abort();
      markers.clear();
      pinRef.current = null;
      layerRef.current = null;
      routeLayerRef.current = null;
      routeRendererRef.current = null;
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
      setView("places");
    },
    [group],
  );

  const fitIslands = useCallback((animate: boolean) => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet) return;
    map.invalidateSize();
    map.fitBounds(leaflet.latLngBounds(ZANZIBAR_ARCHIPELAGO_BOUNDS), {
      padding: [24, 24],
      maxZoom: 10,
      animate,
    });
    setView("islands");
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !ready) return;

    layerRef.current?.remove();
    markersRef.current.clear();

    const layer = leaflet.layerGroup().addTo(map);

    for (const place of filteredPlaces) {
      const isStay = place.category === "Hotel";
      const marker = leaflet
        .marker([place.latitude, place.longitude], {
          icon: leaflet.divIcon({
            className: styles.placeMarker,
            html: placeMarkerHtml(place),
            iconSize: isStay ? [26, 26] : [28, 28],
            iconAnchor: isStay ? [13, 13] : [14, 26],
            tooltipAnchor: isStay ? [0, -16] : [0, -23],
          }),
          title: `${place.name} — ${place.area}`,
          alt: `${place.name}, ${place.category} in ${place.area}`,
          keyboard: true,
          riseOnHover: true,
          // While measuring a route, fade the place pins so the green road
          // line and the A/B markers stay readable.
          opacity: routeMode ? 0.25 : 1,
        })
        .bindTooltip(`${place.name} · ${place.area}`, {
          direction: "top",
          offset: [0, 0],
          opacity: 0.95,
        })
        .on("click", () => {
          if (routeModeRef.current) {
            addRoutePointRef.current({
              lat: place.latitude,
              lng: place.longitude,
              label: `${place.name}, ${place.area}`,
            });
            return;
          }
          onSelectRef.current(place);
        });

      if (!routeMode) {
        marker.bindPopup(() => pointCardHtml(place), {
          className: styles.pointPopup,
          maxWidth: 300,
          minWidth: 236,
          offset: isStay ? [0, -14] : [0, -26],
          autoPanPadding: [18, 18],
        });
      }

      marker.addTo(layer);
      markersRef.current.set(place.id, marker);
    }

    layerRef.current = layer;
  }, [filteredPlaces, ready, routeMode]);

  useEffect(() => {
    if (!ready) return;
    if (!initialFitRef.current) {
      initialFitRef.current = true;
      fitIslands(false);
      return;
    }
    fitGroup(false);
  }, [fitGroup, fitIslands, ready]);

  useEffect(() => {
    if (!ready) return;
    const selectedId = selectedPlace?.id ?? null;

    markersRef.current.forEach((marker, id) => {
      const place = PLACE_BY_ID.get(id);
      if (!place) return;
      const glyph = marker
        .getElement()
        ?.querySelector<HTMLElement>(`.${styles.placeMarkerGlyph}`);
      if (glyph) {
        glyph.classList.toggle(
          styles.placeMarkerSelected,
          id === selectedId,
        );
      }
      marker.setZIndexOffset(id === selectedId ? 1000 : 0);
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
            className: styles.customPin,
            html: customPinHtml(),
            iconSize: [34, 34],
            iconAnchor: [17, 31],
            tooltipAnchor: [0, -28],
          }),
          title: "Trip location pin",
          alt: "Selected trip location",
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

  useEffect(() => {
    if (!routeMode || routeStops.length < 2) return;

    const [start, end] = routeStops;
    const controller = new AbortController();
    let active = true;

    void fetch("/api/route/calculate/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin_lat: start.lat,
        origin_lng: start.lng,
        destination_lat: end.lat,
        destination_lng: end.lng,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          message?: unknown;
          distance_km?: unknown;
          estimated_time_mins?: unknown;
          geometry?: unknown;
          source?: unknown;
        } | null;
        if (!response.ok) {
          throw new Error(
            typeof payload?.message === "string"
              ? payload.message
              : "The route service is unavailable.",
          );
        }
        if (
          typeof payload?.distance_km !== "number" ||
          !Number.isFinite(payload.distance_km) ||
          !isRouteGeometry(payload.geometry)
        ) {
          throw new Error("The route service returned an unexpected result.");
        }
        return {
          distanceKm: payload.distance_km,
          durationMins:
            typeof payload.estimated_time_mins === "number"
              ? payload.estimated_time_mins
              : Math.max(1, Math.round((payload.distance_km / 40) * 60)),
          geometry: payload.geometry,
          source: payload.source === "osrm" ? "osrm" : "estimate",
        } satisfies RouteResult;
      })
      .then((result) => {
        if (!active) return;
        setRoute(result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof Error && error.name === "AbortError") return;
        setRouteError(
          error instanceof Error
            ? error.message
            : "Could not calculate the route.",
        );
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [routeAttempt, routeMode, routeStops]);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !ready) return;

    routeLayerRef.current?.remove();
    routeLayerRef.current = null;
    if (!routeMode) return;

    const layer = leaflet.layerGroup().addTo(map);
    routeLayerRef.current = layer;

    routeStops.forEach((stop, index) => {
      leaflet
        .marker([stop.lat, stop.lng], {
          icon: leaflet.divIcon({
            className: styles.routeMarker,
            html: routeBadgeHtml(index === 0 ? "A" : "B"),
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }),
          interactive: false,
          keyboard: false,
          zIndexOffset: 1500 + index,
        })
        .addTo(layer);
    });

    if (!route || route.geometry.length < 2) return;

    if (route.source === "osrm") {
      leaflet
        .polyline(route.geometry, {
          pane: "trip-route",
          renderer: routeRendererRef.current ?? undefined,
          color: ROUTE_CASING,
          weight: 10,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
          interactive: false,
        })
        .addTo(layer);
    }

    const routeLine = leaflet.polyline(route.geometry, {
      pane: "trip-route",
      renderer: routeRendererRef.current ?? undefined,
      color: ROUTE_GREEN,
      weight: 7,
      opacity: 1,
      dashArray: route.source === "osrm" ? undefined : "8 10",
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
    });
    routeLine.addTo(layer);

    map.fitBounds(routeLine.getBounds(), {
      padding: [40, 40],
      maxZoom: 14,
      animate: true,
    });
  }, [ready, route, routeMode, routeStops]);

  const toggleRouteMode = useCallback(() => {
    if (routeMode) {
      exitRouteMode();
      return;
    }
    if (disabledRef.current) return;
    setRouteMode(true);
    setRouteError(null);
    setRoute(null);
    setRouteStops(
      hasPoint
        ? [
            {
              lat: latitude as number,
              lng: longitude as number,
              label: selectedPlace?.name ?? "Current trip pin",
            },
          ]
        : [],
    );
  }, [
    exitRouteMode,
    hasPoint,
    latitude,
    longitude,
    routeMode,
    selectedPlace?.name,
  ]);

  const handleClear = useCallback(() => {
    setQuery("");
    onClearPoint();
  }, [onClearPoint]);

  const selectedGroup = selectedPlace
    ? TRIP_PLACE_GROUPS.find(
        (item) => item.id === CATEGORY_GROUP.get(selectedPlace.category),
      )
    : undefined;
  const selectedAreaLine = selectedPlace
    ? uniqueJoin([selectedPlace.area, pointContext?.region])
    : uniqueJoin([pointContext?.district, pointContext?.region]);
  const selectedNearest = nearestSummary(pointContext);

  let routeInstruction = "Tap any place or the map to set the start.";
  if (routeStops.length === 1) routeInstruction = "Now tap the destination.";
  else if (routeStops.length === 2)
    routeInstruction = "Pick another point to start a new route.";
  if (routeLoading) routeInstruction = "Calculating the road route…";

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

        <button
          className={`${styles.routeToggle} ${
            routeMode ? styles.routeToggleActive : ""
          }`}
          type="button"
          onClick={toggleRouteMode}
          disabled={disabled}
          aria-pressed={routeMode}
          title="Measure a road route between two points"
        >
          <Navigation size={13} aria-hidden="true" />
          {routeMode ? "Routing on" : "Route"}
        </button>
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
            <div className={styles.mapTop}>
              <span className={styles.mapTopKicker}>Zanzibar</span>
              <div
                className={styles.mapTopActions}
                role="group"
                aria-label="Map view"
              >
                <button
                  className={`${styles.mapViewButton} ${
                    view === "islands" ? styles.mapViewButtonActive : ""
                  }`}
                  type="button"
                  onClick={() => fitIslands(true)}
                  disabled={disabled}
                  aria-pressed={view === "islands"}
                >
                  Full Zanzibar
                </button>
                <button
                  className={`${styles.mapViewButton} ${
                    view === "places" ? styles.mapViewButtonActive : ""
                  }`}
                  type="button"
                  onClick={() => fitGroup(true)}
                  disabled={disabled}
                  aria-pressed={view === "places"}
                >
                  Places
                </button>
              </div>
            </div>
          ) : null}

          {ready && routeMode ? (
            <div className={styles.routePanel} role="status" aria-live="polite">
              <div className={styles.routePanelHead}>
                <span className={styles.routePanelTitle}>
                  <Navigation size={13} aria-hidden="true" /> Road route
                </span>
                <button
                  className={styles.routePanelClose}
                  type="button"
                  onClick={exitRouteMode}
                  aria-label="Close route planner"
                >
                  <X size={13} />
                </button>
              </div>

              {route ? (
                <>
                  <div className={styles.routeSummary}>
                    <span className={styles.routeDistance}>
                      {formatRouteKm(route.distanceKm)}
                      <em>km</em>
                    </span>
                    <span className={styles.routeDuration}>
                      {formatDriveTime(route.durationMins)}
                    </span>
                  </div>
                  <span
                    className={`${styles.routeSource} ${
                      route.source === "estimate"
                        ? styles.routeSourceEstimate
                        : ""
                    }`}
                  >
                    {route.source === "osrm"
                      ? "Following roads · OSRM"
                      : "Straight-line estimate"}
                  </span>
                  <div className={styles.routeStops}>
                    {routeStops.map((stop, index) => (
                      <span key={`${index}-${stop.lat}-${stop.lng}`}>
                        <b>{index === 0 ? "A" : "B"}</b>
                        {stop.label}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className={styles.routeInstruction}>{routeInstruction}</p>
              )}

              {routeError ? (
                <span className={styles.routeError} role="alert">
                  {routeError}
                </span>
              ) : null}

              <div className={styles.routePanelActions}>
                {routeError ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRoute(null);
                      setRouteError(null);
                      setRouteAttempt((value) => value + 1);
                    }}
                  >
                    Retry
                  </button>
                ) : null}
                {routeStops.length === 2 ? (
                  <button type="button" onClick={swapRouteStops}>
                    Swap
                  </button>
                ) : null}
                {routeStops.length > 0 ? (
                  <button type="button" onClick={resetRoute}>
                    Clear route
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {ready ? (
            <div className={styles.legend} aria-hidden="true">
              {legendGroups.map((item) => (
                <span key={item.id} className={styles.legendItem}>
                  <Location01
                    size={12}
                    style={{ color: GROUP_COLORS[item.id as PlaceGroupId] }}
                  />
                  {item.label}
                </span>
              ))}
              <span className={styles.legendItem}>
                <i
                  className={`${styles.legendLine} ${styles.legendLineMain}`}
                />
                Main road
              </span>
              <span className={styles.legendItem}>
                <i className={styles.legendLine} />
                Minor road
              </span>
            </div>
          ) : null}
        </div>

        <aside className={styles.side} aria-label="Zanzibar place list">
          <div className={styles.selection}>
            {selectedPlace ? (
              <>
                <div className={styles.selectionHead}>
                  <span
                    className={styles.pill}
                    style={{
                      background: `${markerColor(selectedPlace.category)}16`,
                      color: markerColor(selectedPlace.category),
                    }}
                  >
                    {selectedPlace.category}
                  </span>
                  <span className={styles.selectionGroup}>
                    {selectedGroup?.label ?? "Zanzibar place"}
                  </span>
                </div>
                <span className={styles.selectionName}>
                  {selectedPlace.name}
                </span>
                <span className={styles.selectionMeta}>
                  <MapPin size={12} aria-hidden="true" />
                  {selectedAreaLine || selectedPlace.area}
                </span>
                <div className={styles.selectionRating}>
                  <span className={styles.stars} aria-hidden="true">
                    {starString(selectedPlace.rating) || "Not rated"}
                  </span>
                  {selectedPlace.rating === null ? null : (
                    <strong>{selectedPlace.rating.toFixed(1)}</strong>
                  )}
                  <span>
                    {selectedPlace.reviews.toLocaleString("en-US")} reviews
                  </span>
                </div>
                <p className={styles.selectionNote}>
                  {CATEGORY_NOTES[selectedPlace.category]}
                </p>
                {selectedNearest ? (
                  <span className={styles.selectionFact}>
                    Nearest · {selectedNearest}
                  </span>
                ) : null}
              </>
            ) : hasPoint ? (
              <>
                <div className={styles.selectionHead}>
                  <span className={styles.pill}>Custom pin</span>
                  <span className={styles.selectionGroup}>
                    {pointContext?.region || "Zanzibar"}
                  </span>
                </div>
                <span className={styles.selectionName}>
                  {pointContext?.nearest
                    ? `Near ${pointContext.nearest.name}`
                    : "Custom map location"}
                </span>
                <span className={styles.selectionMeta}>
                  <MapPin size={12} aria-hidden="true" />
                  {selectedAreaLine || "Dropped on the map"}
                </span>
                {selectedNearest ? (
                  <span className={styles.selectionFact}>
                    Nearest · {selectedNearest}
                  </span>
                ) : (
                  <span className={styles.selectionFact}>
                    Pick a place below to use its name and details.
                  </span>
                )}
              </>
            ) : (
              <span className={styles.hint}>
                Pick a place to fill the trip location and its coordinates, or
                click the map to drop a custom pin. Use Route to measure a road
                route between any two points.
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
                  <ExternalLink size={14} /> Google Maps
                </a>
                <button
                  className={styles.routeFrom}
                  type="button"
                  onClick={() =>
                    startRouteFrom(
                      latitude as number,
                      longitude as number,
                      selectedPlace?.name ?? "Current trip pin",
                    )
                  }
                  disabled={disabled}
                >
                  <Navigation size={13} /> Route from here
                </button>
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
              <Locate size={13} /> Fit list
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
                          if (routeMode) {
                            addRoutePoint({
                              lat: place.latitude,
                              lng: place.longitude,
                              label: `${place.name}, ${place.area}`,
                            });
                            return;
                          }
                          onSelectRef.current(place);
                        }}
                        disabled={disabled}
                        aria-pressed={active}
                      >
                        <span
                          className={styles.placeIcon}
                          style={{ color: markerColor(place.category) }}
                          aria-hidden="true"
                        >
                          {place.category === "Hotel" ? (
                            <KeyRound size={13} />
                          ) : (
                            <Location01 size={13} />
                          )}
                        </span>
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

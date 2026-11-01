"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ActivityIcon,
  BeachIcon,
  CafeIcon,
  CarIcon,
  CompassIcon,
  HospitalIcon,
  House01Icon,
  LandmarkIcon,
  PlantIcon,
  RestaurantIcon,
  ShoppingBagIcon,
  TurtleIcon,
  WellnessIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ExternalLink, Locate, MapPin, Search, Star, X } from "@/components/icons";
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
  ZANZIBAR_CENTER,
  isInZanzibar,
} from "@/lib/zanzibar";
import {
  ZANZIBAR_ARCHIPELAGO_BOUNDS,
  ZANZIBAR_ISLAND_LABELS,
  ZANZIBAR_ISLANDS,
} from "@/lib/zanzibar-outline";
import styles from "@/components/zanzibar-attractions.module.css";

type PlaceGroupId = Exclude<TripPlaceGroupId, "all">;

type IconSvgObject = readonly (readonly [
  string,
  Readonly<Record<string, string | number>>,
])[];

/** Zoom level where dots turn into category symbols. */
const DETAIL_ZOOM = 10.5;
/** Minor streets only appear at neighbourhood zoom so the overview stays legible. */
const MINOR_ROAD_ZOOM = 12;
const ROAD_ATTRIBUTION =
  'Roads © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors (ODbL)';
const PLACE_COUNT = ZANZIBAR_TRIP_PLACES.length;

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

const CATEGORY_ICON: Record<TripPlaceCategory, IconSvgObject> = {
  Attraction: LandmarkIcon,
  "Bar": RestaurantIcon,
  "Beach / Sandbank": BeachIcon,
  "Cafe": CafeIcon,
  "Health / Pharmacy": HospitalIcon,
  "Hotel": House01Icon,
  "Kitesurf School": CompassIcon,
  "Restaurant": RestaurantIcon,
  "Shop / Market": ShoppingBagIcon,
  "Spa / Wellness": WellnessIcon,
  "Spice Farm": PlantIcon,
  "Tour / Activity": ActivityIcon,
  "Transport": CarIcon,
  "Wildlife / Turtles": TurtleIcon,
};

const GROUP_ICON: Record<PlaceGroupId, IconSvgObject> = {
  attractions: LandmarkIcon,
  activities: ActivityIcon,
  food: RestaurantIcon,
  stays: House01Icon,
  shopping: ShoppingBagIcon,
  wellness: WellnessIcon,
  services: CarIcon,
};

const LEGEND_GROUPS = TRIP_PLACE_GROUPS.filter(
  (group): group is (typeof TRIP_PLACE_GROUPS)[number] & { id: PlaceGroupId } =>
    group.id !== "all",
);

// Town signs give the map the same orientation cues as a printed road map.
// Coastal villages only appear once the user zooms into that stretch of coast.
const TOWN_SIGNS: { name: string; at: [number, number]; minZoom: number }[] = [
  { name: "Nungwi", at: [-5.7272, 39.2992], minZoom: 8.5 },
  { name: "Kendwa", at: [-5.7516, 39.2912], minZoom: 10 },
  { name: "Matemwe", at: [-5.9, 39.4333], minZoom: 9.25 },
  { name: "Kiwengwa", at: [-5.9901, 39.3761], minZoom: 9.25 },
  { name: "Stone Town", at: [-6.162, 39.192], minZoom: 8.5 },
  { name: "Chwaka", at: [-6.1652, 39.4351], minZoom: 9.5 },
  { name: "Uroa", at: [-6.093, 39.4237], minZoom: 10 },
  { name: "Bwejuu", at: [-6.2372, 39.5323], minZoom: 10.25 },
  { name: "Paje", at: [-6.2667, 39.5341], minZoom: 9.75 },
  { name: "Jambiani", at: [-6.3219, 39.5468], minZoom: 9.75 },
  { name: "Michamvi", at: [-6.2, 39.5], minZoom: 10.25 },
  { name: "Kizimkazi", at: [-6.45, 39.47], minZoom: 9.5 },
  { name: "Makunduchi", at: [-6.4127, 39.5534], minZoom: 10 },
  { name: "Wete", at: [-5.0564, 39.728], minZoom: 9 },
  { name: "Chake Chake", at: [-5.2459, 39.7666], minZoom: 9 },
  { name: "Mkoani", at: [-5.36, 39.6484], minZoom: 9.25 },
];

function markerColor(category: TripPlaceCategory) {
  return GROUP_COLORS[CATEGORY_GROUP.get(category) ?? "attractions"];
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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function iconPathMarkup(icon: IconSvgObject, stroke: string, strokeWidth: number) {
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

function markerGlyphHtml(place: TripPlace) {
  const color = markerColor(place.category);
  const icon = CATEGORY_ICON[place.category] ?? LandmarkIcon;
  const stayClass = place.category === "Hotel" ? ` ${styles.markerStay}` : "";
  return `<span class="${styles.markerGlyph}${stayClass}" style="--marker-color:${color}">
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${iconPathMarkup(icon, "#ffffff", 2.6)}${iconPathMarkup(icon, color, 2)}
    </svg>
  </span>`;
}

function buildPopup(place: TripPlace) {
  const group = TRIP_PLACE_GROUPS.find(
    (item) => item.id === CATEGORY_GROUP.get(place.category),
  );

  const root = document.createElement("div");
  root.className = styles.popup;
  root.style.setProperty("--popup-accent", markerColor(place.category));

  const head = document.createElement("div");
  head.className = styles.popupHead;

  const groupLabel = document.createElement("span");
  groupLabel.className = styles.popupGroup;
  groupLabel.textContent = group?.label ?? "Place";

  const category = document.createElement("span");
  category.className = styles.popupCategory;
  category.textContent = place.category;

  head.append(groupLabel, category);

  const title = document.createElement("strong");
  title.className = styles.popupTitle;
  title.textContent = place.name;

  const area = document.createElement("span");
  area.className = styles.popupArea;
  area.textContent = place.area;

  const rating = document.createElement("span");
  rating.className = styles.popupRating;
  rating.textContent = ratingLabel(place);

  const note = document.createElement("p");
  note.className = styles.popupNote;
  note.textContent = CATEGORY_NOTES[place.category];

  const facts = document.createElement("dl");
  facts.className = styles.popupFacts;
  const rows: [string, string][] = [
    ["Coordinates", `${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`],
    ["Reviews", place.reviews.toLocaleString("en-US")],
  ];
  for (const [label, value] of rows) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const detail = document.createElement("dd");
    detail.textContent = value;
    row.append(term, detail);
    facts.append(row);
  }

  const link = document.createElement("a");
  link.className = styles.popupLink;
  link.href = tripPlaceMapsUrl(place);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open in Google Maps";

  root.append(head, title, area, rating, note, facts, link);
  return root;
}

export default function ZanzibarAttractions() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const rendererRef = useRef<Leaflet.Canvas | null>(null);
  const markersRef = useRef<Map<number, Leaflet.Marker | Leaflet.CircleMarker>>(
    new Map(),
  );
  const markerKindsRef = useRef<Map<number, "dot" | "icon">>(new Map());
  const pendingPopupRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [detail, setDetail] = useState(false);
  const [group, setGroup] = useState<TripPlaceGroupId>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filteredPlaces = useMemo(() => {
    const needle = normalize(query);
    return tripPlacesForGroup(group).filter((place) => {
      if (!isInZanzibar(place.latitude, place.longitude)) return false;
      if (!needle) return true;
      return normalize(
        `${place.name} ${place.area} ${place.category}`,
      ).includes(needle);
    });
  }, [group, query]);

  const rankedPlaces = useMemo(
    () =>
      [...filteredPlaces].sort((a, b) => {
        const ratingDiff = (b.rating ?? -1) - (a.rating ?? -1);
        if (ratingDiff !== 0) return ratingDiff;
        const reviewDiff = b.reviews - a.reviews;
        if (reviewDiff !== 0) return reviewDiff;
        return a.name.localeCompare(b.name);
      }),
    [filteredPlaces],
  );

  const selectedPlace =
    filteredPlaces.find((place) => place.id === selectedId) ?? null;

  const filtersActive = group !== "all" || query.trim().length > 0;

  const changeGroup = (next: TripPlaceGroupId) => {
    setGroup(next);
    setSelectedId(null);
  };

  const changeQuery = (next: string) => {
    setQuery(next);
    setSelectedId(null);
  };

  const resetFilters = () => {
    setGroup("all");
    setQuery("");
    setSelectedId(null);
  };

  const fitPlaces = useCallback(
    (animate: boolean) => {
      const map = mapRef.current;
      const leaflet = leafletRef.current;
      if (!map || !leaflet) return;
      const points = filteredPlaces.length ? filteredPlaces : ZANZIBAR_TRIP_PLACES;
      const bounds = leaflet.latLngBounds(
        points.map(
          (place) => [place.latitude, place.longitude] as [number, number],
        ),
      );
      map.invalidateSize();
      const compact =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 640px)").matches;
      map.fitBounds(bounds, {
        paddingTopLeft: compact ? [24, 64] : [28, 28],
        paddingBottomRight: compact ? [24, 44] : [28, 28],
        maxZoom: 11,
        animate: animate && !prefersReducedMotion(),
      });
    },
    [filteredPlaces],
  );

  const fitIslands = useCallback(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet) return;
    map.invalidateSize();
    map.fitBounds(leaflet.latLngBounds(ZANZIBAR_ARCHIPELAGO_BOUNDS), {
      padding: [24, 24],
      maxZoom: 10,
      animate: !prefersReducedMotion(),
    });
  }, []);

  const selectPlace = useCallback(
    (place: TripPlace) => {
      setSelectedId(place.id);
      const map = mapRef.current;
      if (!map) return;

      if (detail) {
        markersRef.current.get(place.id)?.openPopup();
      } else {
        pendingPopupRef.current = place.id;
      }

      map.flyTo(
        [place.latitude, place.longitude],
        Math.max(map.getZoom(), DETAIL_ZOOM + 0.5),
        { duration: prefersReducedMotion() ? 0 : 0.55 },
      );
    },
    [detail],
  );

  // Map shell: tiles, land outline, roads, island and town signs.
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    const markers = markersRef.current;
    const markerKinds = markerKindsRef.current;
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
          scrollWheelZoom: false,
          zoomControl: false,
        });

        leaflet.control.zoom({ position: "topright" }).addTo(map);
        leaflet
          .control.scale({ position: "bottomright", imperial: false })
          .addTo(map);

        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          })
          .addTo(map);

        // Fixed drawing order: land, roads, place pins, then map labels.
        const roadsPane = map.createPane("explore-roads");
        roadsPane.style.zIndex = "410";
        roadsPane.style.pointerEvents = "none";
        const placesPane = map.createPane("explore-places");
        placesPane.style.zIndex = "420";
        const labelPane = map.createPane("explore-labels");
        labelPane.style.zIndex = "440";
        labelPane.style.pointerEvents = "none";

        const roadsRenderer = leaflet.canvas({ padding: 0.5, pane: "explore-roads" });
        roadsRenderer.addTo(map);
        const placesRenderer = leaflet.canvas({
          padding: 0.5,
          pane: "explore-places",
        });
        placesRenderer.addTo(map);
        rendererRef.current = placesRenderer;

        const islandLayer = leaflet.layerGroup().addTo(map);
        for (const island of ZANZIBAR_ISLANDS) {
          leaflet
            .polygon(island.coordinates, {
              color: "#0b5f63",
              weight: island.name === "Islet" ? 1 : 1.8,
              opacity: 0.8,
              fillColor: "#0f766e",
              fillOpacity: 0.14,
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
                pane: "explore-labels",
                interactive: false,
                keyboard: false,
                icon: leaflet.divIcon({
                  className: styles.islandLabel,
                  html: `<span>${label.name}</span>`,
                  iconSize: [140, 18],
                  iconAnchor: [70, 9],
                }),
              })
              .addTo(map),
          );
        }

        // Town signs: the map equivalent of direction signs on a road map.
        const signMarkers: { marker: Leaflet.Marker; minZoom: number }[] = [];
        for (const sign of TOWN_SIGNS) {
          const marker = leaflet
            .marker(sign.at, {
              pane: "explore-labels",
              interactive: false,
              keyboard: false,
              icon: leaflet.divIcon({
                className: styles.townSign,
                html: `<span><i aria-hidden="true"></i>${sign.name}</span>`,
                iconSize: [130, 20],
                iconAnchor: [65, 10],
              }),
            })
            .addTo(map);
          signMarkers.push({ marker, minZoom: sign.minZoom });
        }

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
                pane: "explore-roads",
                renderer: roadsRenderer,
                color: "#f8fafc",
                weight: 7,
                opacity: 0.7,
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
                smoothFactor: 1.1,
              })
              .addTo(map);
            leaflet
              .polyline(roads as Leaflet.LatLngExpression[][], {
                pane: "explore-roads",
                renderer: roadsRenderer,
                color: "#334155",
                weight: 3.6,
                opacity: 0.95,
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
            .then((payload: { roads?: [number, number][][] } | null) => {
              if (cancelled || !payload?.roads?.length) return;
              minorRoad = leaflet.polyline(
                payload.roads as Leaflet.LatLngExpression[][],
                {
                  pane: "explore-roads",
                  renderer: roadsRenderer,
                  color: "#64748b",
                  weight: 1.2,
                  opacity: 0.45,
                  lineCap: "round",
                  lineJoin: "round",
                  interactive: false,
                  smoothFactor: 1.2,
                },
              );
              if (map.getZoom() >= MINOR_ROAD_ZOOM) minorRoad.addTo(map);
            })
            .catch(() => {
              // No minor roads; main roads and the base map remain.
            })
            .finally(() => {
              minorRoadLoading = false;
            });
        };

        const syncZoom = () => {
          const zoom = map.getZoom();
          for (const label of islandLabels) {
            label.setOpacity(zoom < 9.5 ? 1 : 0);
          }
          for (const sign of signMarkers) {
            sign.marker.setOpacity(zoom >= sign.minZoom ? 1 : 0);
          }
          syncMinorRoads();
          setDetail(zoom >= DETAIL_ZOOM);
        };

        void addMainRoads();
        map.on("zoomend", syncZoom);
        syncZoom();

        mapRef.current = map;
        leafletRef.current = leaflet;
        setReady(true);
        window.requestAnimationFrame(() => map.invalidateSize());
      })
      .catch(() => {
        if (!cancelled) setMapError(true);
      });

    return () => {
      cancelled = true;
      roadsController.abort();
      layerRef.current = null;
      rendererRef.current = null;
      markers.clear();
      markerKinds.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      setReady(false);
    };
  }, []);

  // Markers: small dots at island scale, category symbols once zoomed in.
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !ready) return;

    layerRef.current?.remove();
    markersRef.current.clear();
    markerKindsRef.current.clear();

    const renderer = rendererRef.current;
    if (!renderer) return;
    const layer = leaflet.layerGroup().addTo(map);

    for (const place of filteredPlaces) {
      let marker: Leaflet.Marker | Leaflet.CircleMarker;

      if (detail) {
        const isStay = place.category === "Hotel";
        marker = leaflet.marker([place.latitude, place.longitude], {
          pane: "explore-places",
          icon: leaflet.divIcon({
            className: styles.marker,
            html: markerGlyphHtml(place),
            iconSize: [20, 20],
            iconAnchor: isStay ? [10, 10] : [10, 19],
            tooltipAnchor: isStay ? [0, -13] : [0, -18],
          }),
          title: `${place.name} — ${place.area}`,
          alt: `${place.name}, ${place.category} in ${place.area}`,
          riseOnHover: true,
        });
        markerKindsRef.current.set(place.id, "icon");
      } else {
        marker = leaflet.circleMarker([place.latitude, place.longitude], {
          radius: 4,
          color: "#ffffff",
          weight: 1.2,
          fillColor: markerColor(place.category),
          fillOpacity: 0.92,
          renderer,
        });
        markerKindsRef.current.set(place.id, "dot");
      }

      marker.bindTooltip(`${place.name} · ${place.area}`, {
        direction: "top",
        offset: [0, -4],
        opacity: 0.95,
      });
      marker.bindPopup(buildPopup(place), {
        maxWidth: 300,
        minWidth: 240,
        offset: [0, -22],
        autoPanPadding: [16, 16],
      });
      marker.on("click", () => setSelectedId(place.id));

      marker.addTo(layer);
      markersRef.current.set(place.id, marker);
    }

    layerRef.current = layer;

    const pending = pendingPopupRef.current;
    if (pending !== null) {
      pendingPopupRef.current = null;
      markersRef.current.get(pending)?.openPopup();
    }
  }, [detail, filteredPlaces, ready]);

  // Keep the selected pin prominent without rebuilding the layer.
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const selected = id === selectedId;
      const kind = markerKindsRef.current.get(id);
      if (kind === "icon") {
        const iconMarker = marker as Leaflet.Marker;
        iconMarker.setZIndexOffset(selected ? 1000 : 0);
        const glyph = iconMarker
          .getElement()
          ?.querySelector<HTMLElement>(`.${styles.markerGlyph}`);
        glyph?.classList.toggle(styles.markerSelected, selected);
      } else {
        (marker as Leaflet.CircleMarker).setStyle({
          radius: selected ? 7 : 4,
          weight: selected ? 2 : 1.2,
          fillOpacity: selected ? 1 : 0.92,
        });
        if (selected) (marker as Leaflet.CircleMarker).bringToFront();
      }
    });
  }, [detail, filteredPlaces, ready, selectedId]);

  // Frame every visible place on load and whenever the filters change.
  useEffect(() => {
    if (!ready) return;
    fitPlaces(false);
  }, [fitPlaces, ready]);

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    const first = rankedPlaces[0];
    if (first) selectPlace(first);
  };

  return (
    <section
      className={styles.section}
      id="zanzibar-attractions"
      aria-labelledby="zanzibar-attractions-title"
    >
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>Explore</p>
          <h2 className={styles.title} id="zanzibar-attractions-title">
            Zanzibar attractions &amp; places
          </h2>
          <p className={styles.lead}>
            All {PLACE_COUNT} mapped places across Zanzibar — heritage sites,
            beaches, spice farms, restaurants and stays — with main roads and
            town signs on one interactive map.
          </p>
        </div>
        <div className={styles.stats}>
          <span className={styles.stat}>
            <strong>{PLACE_COUNT}</strong>
            <span>places</span>
          </span>
          <span className={styles.stat}>
            <strong>{Object.keys(CATEGORY_NOTES).length}</strong>
            <span>categories</span>
          </span>
          <span className={styles.stat}>
            <strong>2</strong>
            <span>islands</span>
          </span>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchRow}>
          <label className={styles.search}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search places, areas or categories"
              aria-label="Search Zanzibar places"
            />
            {query ? (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => changeQuery("")}
                aria-label="Clear search"
              >
                <X size={14} aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <p className={styles.resultCount} aria-live="polite">
            {filtersActive
              ? `${filteredPlaces.length} of ${PLACE_COUNT} places`
              : `Showing all ${PLACE_COUNT} places`}
          </p>
          {filtersActive ? (
            <button type="button" className={styles.reset} onClick={resetFilters}>
              Reset filters
            </button>
          ) : null}
        </div>

        <div
          className={styles.chips}
          role="group"
          aria-label="Filter places by category"
        >
          {TRIP_PLACE_GROUPS.map((item) => {
            const active = item.id === group;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                onClick={() => changeGroup(item.id)}
                title={item.description}
              >
                <span>{item.label}</span>
                <span className={styles.chipCount}>
                  {GROUP_COUNTS.get(item.id) ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.mapCard}>
          <div
            ref={containerRef}
            className={styles.map}
            role="region"
            aria-label="Map of Zanzibar places, roads and town signs"
          />

          <div className={styles.mapTop}>
            <span className={styles.mapKicker}>
              <MapPin size={13} aria-hidden="true" />
              Unguja &amp; Pemba
            </span>
            <button
              type="button"
              className={styles.mapAction}
              onClick={() => {
                setSelectedId(null);
                mapRef.current?.closePopup();
                fitIslands();
              }}
              disabled={!ready}
            >
              <Locate size={13} aria-hidden="true" />
              Islands
            </button>
            <button
              type="button"
              className={styles.mapAction}
              onClick={() => {
                setSelectedId(null);
                mapRef.current?.closePopup();
                fitPlaces(true);
              }}
              disabled={!ready}
            >
              Fit places
            </button>
          </div>

          {!ready && !mapError ? (
            <div className={styles.mapStatus}>Loading the Zanzibar map…</div>
          ) : null}
          {mapError ? (
            <div className={styles.mapStatus} role="status">
              The map could not load. Use the place list to explore Zanzibar.
            </div>
          ) : null}

          {ready ? (
            <div className={styles.legend} role="group" aria-label="Map key">
              <div className={styles.legendGroups}>
                {LEGEND_GROUPS.map((item) => (
                  <span key={item.id} className={styles.legendItem}>
                    <HugeiconsIcon
                      icon={GROUP_ICON[item.id] as never}
                      size={11}
                      color={GROUP_COLORS[item.id]}
                      aria-hidden="true"
                    />
                    {item.label}
                  </span>
                ))}
              </div>
              <div className={styles.legendRules}>
                <span className={styles.legendItem}>
                  <i
                    className={`${styles.roadLine} ${styles.roadLineMain}`}
                    aria-hidden="true"
                  />
                  Main road
                </span>
                <span className={styles.legendItem}>
                  <i className={styles.roadLine} aria-hidden="true" />
                  Minor road
                </span>
                <span className={styles.legendItem}>
                  <i className={styles.townSignSample} aria-hidden="true" />
                  Town
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <aside className={styles.aside} aria-label="Zanzibar places">
          {selectedPlace ? (
            <div
              className={styles.selectedCard}
              style={
                {
                  "--place-color": markerColor(selectedPlace.category),
                } as CSSProperties
              }
            >
              <div className={styles.selectedHead}>
                <span className={styles.selectedPill}>
                  {selectedPlace.category}
                </span>
                <button
                  type="button"
                  className={styles.selectedClose}
                  onClick={() => setSelectedId(null)}
                  aria-label="Clear selected place"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
              <h3 className={styles.selectedName}>{selectedPlace.name}</h3>
              <p className={styles.selectedArea}>
                <MapPin size={12} aria-hidden="true" />
                {selectedPlace.area}
              </p>
              <div className={styles.selectedRating}>
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
              <p className={styles.selectedNote}>
                {CATEGORY_NOTES[selectedPlace.category]}
              </p>
              <div className={styles.selectedCoords}>
                <span>
                  <em>Lat</em> {selectedPlace.latitude.toFixed(5)}
                </span>
                <span>
                  <em>Lng</em> {selectedPlace.longitude.toFixed(5)}
                </span>
              </div>
              <a
                className={styles.mapsLink}
                href={tripPlaceMapsUrl(selectedPlace)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={13} aria-hidden="true" />
                Open in Google Maps
              </a>
            </div>
          ) : (
            <div className={styles.hintCard}>
              <span className={styles.hintIcon} aria-hidden="true">
                <MapPin size={16} />
              </span>
              <p>
                Select a pin or a place from the list to see its category,
                rating and coordinates.
              </p>
            </div>
          )}

          <div className={styles.listPanel}>
            <div className={styles.listHead}>
              <h3 className={styles.listTitle}>Places</h3>
              <span className={styles.listCount}>{filteredPlaces.length}</span>
            </div>

            {rankedPlaces.length > 0 ? (
              <ul className={styles.list}>
                {rankedPlaces.map((place, index) => {
                  const active = selectedPlace?.id === place.id;
                  return (
                    <li key={place.id}>
                      <button
                        type="button"
                        className={`${styles.listButton} ${
                          active ? styles.listButtonActive : ""
                        }`}
                        onClick={() => selectPlace(place)}
                        aria-current={active ? "true" : undefined}
                      >
                        <span className={styles.listRank}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className={styles.listBody}>
                          <span className={styles.listName}>{place.name}</span>
                          <span className={styles.listMeta}>
                            <i
                              style={{ background: markerColor(place.category) }}
                              aria-hidden="true"
                            />
                            {place.area} · {place.category}
                          </span>
                        </span>
                        <span className={styles.listRating}>
                          {place.rating === null ? (
                            "—"
                          ) : (
                            <>
                              <Star size={11} aria-hidden="true" />
                              {place.rating.toFixed(1)}
                            </>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className={styles.emptyList}>
                <p>No places match the current filters.</p>
                <button type="button" onClick={resetFilters}>
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

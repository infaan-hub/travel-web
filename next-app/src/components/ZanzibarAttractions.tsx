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
import {
  Compass,
  ExternalLink,
  Layers,
  Locate,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  TRIP_PLACE_GROUPS,
  ZANZIBAR_TRIP_PLACES,
  tripPlaceMapsUrl,
  tripPlacesForGroup,
  type TripPlace,
  type TripPlaceCategory,
  type TripPlaceGroupId,
} from "@/lib/trips";
import { isInZanzibar } from "@/lib/zanzibar";
import {
  UNGUJA_BOUNDS,
  ZANZIBAR_ARCHIPELAGO_BOUNDS,
  ZANZIBAR_ISLAND_LABELS,
  ZANZIBAR_ISLANDS,
} from "@/lib/zanzibar-outline";
import styles from "@/components/zanzibar-attractions.module.css";

type PlaceGroupId = Exclude<TripPlaceGroupId, "all">;
type BasemapId = "voyager" | "satellite" | "streets";
type IslandScope = "unguja" | "archipelago";

type IconSvgObject = readonly (readonly [
  string,
  Readonly<Record<string, string | number>>,
])[];

type ZanzibarAttractionsProps = {
  /** Optional callback used on /trips/ to measure a route straight to a selected place. */
  onMeasurePlace?: (place: TripPlace) => void;
};

/** Zoom level where compact dots switch to full category icon pins. */
const DETAIL_ZOOM = 11.25;
/** Minor streets appear at neighbourhood zoom so the Unguja overview stays crisp. */
const MINOR_ROAD_ZOOM = 12.5;
const UNGUJA_CENTER: [number, number] = [-6.125, 39.355];
const PLACE_COUNT = ZANZIBAR_TRIP_PLACES.length;
const CURATED_POI_MAX_ID = 326;
const LIST_PAGE_SIZE = 60;

const BASEMAPS: Record<
  BasemapId,
  { label: string; url: string; attribution: string; maxZoom: number }
> = {
  voyager: {
    label: "Map",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
    maxZoom: 19,
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      'Imagery &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>',
    maxZoom: 18,
  },
  streets: {
    label: "Streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

const GROUP_COLORS: Record<PlaceGroupId, string> = {
  attractions: "#0f766e",
  activities: "#7c3aed",
  areas: "#475569",
  food: "#dc2626",
  stays: "#1d4ed8",
  shopping: "#db2777",
  wellness: "#9333ea",
  services: "#0369a1",
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
  City: "City or town centre and its services.",
  District: "District administrative area.",
  Bar: "Drinks, music and an easy evening atmosphere.",
  "Beach / Sandbank": "Sand, swimming and Indian Ocean views.",
  Cafe: "Coffee, snacks and a relaxed pause.",
  "Health / Pharmacy": "Medical help and everyday supplies.",
  Hotel: "A place to check in and stay overnight.",
  "Kitesurf School": "Kitesurf lessons and water-sports gear.",
  Region: "Regional administrative area.",
  Restaurant: "Local or international food and drink.",
  "Shop / Market": "Souvenirs, spices and local shopping.",
  "Spa / Wellness": "Treatments, massage and relaxation.",
  "Spice Farm": "Spice-growing tours, tastings and gardens.",
  Street: "Street or road corridor on the island.",
  "Tour / Activity": "A guided experience or excursion.",
  Transport: "Ferry, airport or local transport hub.",
  Ward: "Ward-level administrative neighbourhood.",
  "Wildlife / Turtles": "Wildlife encounter and conservation site.",
};

const CATEGORY_ICON: Record<TripPlaceCategory, IconSvgObject> = {
  Attraction: LandmarkIcon,
  City: LandmarkIcon,
  District: LandmarkIcon,
  Bar: RestaurantIcon,
  "Beach / Sandbank": BeachIcon,
  Cafe: CafeIcon,
  "Health / Pharmacy": HospitalIcon,
  Hotel: House01Icon,
  "Kitesurf School": CompassIcon,
  Region: LandmarkIcon,
  Restaurant: RestaurantIcon,
  "Shop / Market": ShoppingBagIcon,
  "Spa / Wellness": WellnessIcon,
  "Spice Farm": PlantIcon,
  Street: LandmarkIcon,
  "Tour / Activity": ActivityIcon,
  Transport: CarIcon,
  Ward: LandmarkIcon,
  "Wildlife / Turtles": TurtleIcon,
};

const GROUP_ICON: Record<PlaceGroupId, IconSvgObject> = {
  attractions: LandmarkIcon,
  activities: ActivityIcon,
  areas: LandmarkIcon,
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

/** Verified real-world Unguja & Pemba town/hotspot coordinates (all on real land). */
const TOWN_SIGNS: {
  id: string;
  name: string;
  at: [number, number];
  minZoom: number;
  flyZoom: number;
  quickJump?: boolean;
}[] = [
  { id: "stone-town", name: "Stone Town", at: [-6.162, 39.1915], minZoom: 8.5, flyZoom: 14, quickJump: true },
  { id: "nungwi", name: "Nungwi", at: [-5.7272, 39.2992], minZoom: 8.5, flyZoom: 13.5, quickJump: true },
  { id: "kendwa", name: "Kendwa", at: [-5.7516, 39.2912], minZoom: 9.75, flyZoom: 13.75, quickJump: true },
  { id: "matemwe", name: "Matemwe", at: [-5.8752, 39.3525], minZoom: 9.25, flyZoom: 13.25, quickJump: true },
  { id: "kiwengwa", name: "Kiwengwa", at: [-5.9901, 39.3761], minZoom: 9.25, flyZoom: 13.25, quickJump: true },
  { id: "bububu", name: "Bububu", at: [-6.0989, 39.2204], minZoom: 10.25, flyZoom: 13.25 },
  { id: "uroa", name: "Uroa", at: [-6.093, 39.4237], minZoom: 10, flyZoom: 13.25, quickJump: true },
  { id: "chwaka", name: "Chwaka", at: [-6.1652, 39.4351], minZoom: 10, flyZoom: 13.25 },
  { id: "michamvi", name: "Michamvi", at: [-6.146, 39.508], minZoom: 9.75, flyZoom: 13.25, quickJump: true },
  { id: "airport", name: "Airport (ZNZ)", at: [-6.2185, 39.2214], minZoom: 10.25, flyZoom: 13.5 },
  { id: "jozani", name: "Jozani Forest", at: [-6.2416, 39.414], minZoom: 9.75, flyZoom: 13, quickJump: true },
  { id: "bwejuu", name: "Bwejuu", at: [-6.2332, 39.532], minZoom: 10.25, flyZoom: 13.5 },
  { id: "paje", name: "Paje", at: [-6.2667, 39.5341], minZoom: 9.25, flyZoom: 13.5, quickJump: true },
  { id: "jambiani", name: "Jambiani", at: [-6.3219, 39.5468], minZoom: 9.5, flyZoom: 13.25, quickJump: true },
  { id: "fumba", name: "Fumba", at: [-6.3148, 39.2848], minZoom: 9.75, flyZoom: 13.25, quickJump: true },
  { id: "makunduchi", name: "Makunduchi", at: [-6.4127, 39.5534], minZoom: 10, flyZoom: 13 },
  { id: "kizimkazi", name: "Kizimkazi", at: [-6.4494, 39.468], minZoom: 9.25, flyZoom: 13.25, quickJump: true },
  { id: "wete", name: "Wete", at: [-5.0564, 39.728], minZoom: 9, flyZoom: 12.5 },
  { id: "chake-chake", name: "Chake Chake", at: [-5.2459, 39.7666], minZoom: 9, flyZoom: 12.5 },
  { id: "mkoani", name: "Mkoani", at: [-5.36, 39.6484], minZoom: 9.25, flyZoom: 12.5 },
];

const QUICK_AREAS = TOWN_SIGNS.filter((town) => town.quickJump);

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
  const curatedClass =
    place.id <= CURATED_POI_MAX_ID ? ` ${styles.markerCurated}` : "";
  return `<span class="${styles.markerGlyph}${curatedClass}" style="--marker-color:${color}">
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${iconPathMarkup(icon, color, 2.1)}
    </svg>
  </span>`;
}

function buildPopup(
  place: TripPlace,
  onMeasure?: (target: TripPlace) => void,
) {
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
    ["GPS", `${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`],
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

  const actions = document.createElement("div");
  actions.className = styles.popupActions;

  if (onMeasure) {
    const measureBtn = document.createElement("button");
    measureBtn.type = "button";
    measureBtn.className = styles.popupMeasureBtn;
    measureBtn.textContent = "Measure route";
    measureBtn.addEventListener("click", () => onMeasure(place));
    actions.append(measureBtn);
  }

  const link = document.createElement("a");
  link.className = styles.popupLink;
  link.href = tripPlaceMapsUrl(place);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Google Maps";
  actions.append(link);

  root.append(head, title, area, rating, note, facts, actions);
  return root;
}

export default function ZanzibarAttractions({
  onMeasurePlace,
}: ZanzibarAttractionsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const tileLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const islandPolygonsRef = useRef<Leaflet.Polygon[]>([]);
  const mainRoadsRef = useRef<Leaflet.LayerGroup | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const rendererRef = useRef<Leaflet.Canvas | null>(null);
  const markersRef = useRef<Map<number, Leaflet.Marker | Leaflet.CircleMarker>>(
    new Map(),
  );
  const markerKindsRef = useRef<Map<number, "dot" | "icon">>(new Map());
  const pendingPopupRef = useRef<number | null>(null);
  const onMeasureRef = useRef(onMeasurePlace);

  useEffect(() => {
    onMeasureRef.current = onMeasurePlace;
  }, [onMeasurePlace]);

  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [detail, setDetail] = useState(false);
  const [basemap, setBasemap] = useState<BasemapId>("voyager");
  const [islandScope, setIslandScope] = useState<IslandScope>("unguja");
  const [showRoads, setShowRoads] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [highlightsOnly, setHighlightsOnly] = useState(false);
  const [group, setGroup] = useState<TripPlaceGroupId>("all");
  const [query, setQuery] = useState("");
  const [activeQuickArea, setActiveQuickArea] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);

  const filteredPlaces = useMemo(() => {
    const needle = normalize(query);
    return tripPlacesForGroup(group).filter((place) => {
      if (!isInZanzibar(place.latitude, place.longitude)) return false;
      if (highlightsOnly && place.id > CURATED_POI_MAX_ID) return false;
      if (!needle) return true;
      return normalize(
        `${place.name} ${place.area} ${place.category}`,
      ).includes(needle);
    });
  }, [group, highlightsOnly, query]);

  const rankedPlaces = useMemo(
    () =>
      [...filteredPlaces].sort((a, b) => {
        const curatedDiff =
          Number(a.id > CURATED_POI_MAX_ID) - Number(b.id > CURATED_POI_MAX_ID);
        if (curatedDiff !== 0) return curatedDiff;
        const ratingDiff = (b.rating ?? -1) - (a.rating ?? -1);
        if (ratingDiff !== 0) return ratingDiff;
        const reviewDiff = b.reviews - a.reviews;
        if (reviewDiff !== 0) return reviewDiff;
        return a.name.localeCompare(b.name);
      }),
    [filteredPlaces],
  );

  const visiblePlaces = useMemo(
    () => rankedPlaces.slice(0, visibleCount),
    [rankedPlaces, visibleCount],
  );

  const selectedPlace =
    filteredPlaces.find((place) => place.id === selectedId) ?? null;

  const filtersActive =
    group !== "all" || query.trim().length > 0 || highlightsOnly;

  const changeGroup = (next: TripPlaceGroupId) => {
    setGroup(next);
    setSelectedId(null);
    setVisibleCount(LIST_PAGE_SIZE);
  };

  const changeQuery = (next: string) => {
    setQuery(next);
    setSelectedId(null);
    setActiveQuickArea(null);
    setVisibleCount(LIST_PAGE_SIZE);
  };

  const toggleHighlights = () => {
    setHighlightsOnly((prev) => !prev);
    setSelectedId(null);
    setVisibleCount(LIST_PAGE_SIZE);
  };

  const fitUnguja = useCallback((animate: boolean) => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet) return;
    map.invalidateSize();
    const compact =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches;
    map.fitBounds(leaflet.latLngBounds(UNGUJA_BOUNDS), {
      paddingTopLeft: compact ? [18, 56] : [26, 56],
      paddingBottomRight: compact ? [18, 36] : [26, 26],
      maxZoom: 10.5,
      animate: animate && !prefersReducedMotion(),
    });
    setIslandScope("unguja");
    setActiveQuickArea(null);
  }, []);

  const fitArchipelago = useCallback(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet) return;
    map.invalidateSize();
    map.fitBounds(leaflet.latLngBounds(ZANZIBAR_ARCHIPELAGO_BOUNDS), {
      padding: [28, 44],
      maxZoom: 9.75,
      animate: !prefersReducedMotion(),
    });
    setIslandScope("archipelago");
    setActiveQuickArea(null);
  }, []);

  const fitFilteredPlaces = useCallback(
    (animate: boolean) => {
      const map = mapRef.current;
      const leaflet = leafletRef.current;
      if (!map || !leaflet) return;

      // Keep Unguja framed by default when no narrow filter is active
      if (!filtersActive) {
        fitUnguja(animate);
        return;
      }

      const ungujaMatches = filteredPlaces.filter(
        (place) => place.area !== "Pemba",
      );
      const points =
        ungujaMatches.length > 0
          ? ungujaMatches
          : filteredPlaces.length > 0
            ? filteredPlaces
            : ZANZIBAR_TRIP_PLACES;

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
        paddingTopLeft: compact ? [24, 62] : [36, 60],
        paddingBottomRight: compact ? [24, 42] : [36, 36],
        maxZoom: 13,
        animate: animate && !prefersReducedMotion(),
      });
    },
    [filteredPlaces, filtersActive, fitUnguja],
  );

  const resetFilters = () => {
    setGroup("all");
    setQuery("");
    setHighlightsOnly(false);
    setSelectedId(null);
    setActiveQuickArea(null);
    setVisibleCount(LIST_PAGE_SIZE);
    fitUnguja(true);
  };

  const flyToQuickArea = (town: (typeof TOWN_SIGNS)[number]) => {
    const map = mapRef.current;
    if (!map) return;
    setActiveQuickArea(town.id);
    setSelectedId(null);
    map.closePopup();
    map.flyTo(town.at, town.flyZoom, {
      duration: prefersReducedMotion() ? 0 : 0.6,
    });
  };

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
        Math.max(map.getZoom(), DETAIL_ZOOM + 2.25),
        { duration: prefersReducedMotion() ? 0 : 0.55 },
      );
    },
    [detail],
  );

  // Initialize Leaflet map once
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
          center: UNGUJA_CENTER,
          zoom: 10,
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

        const initialBase = BASEMAPS.voyager;
        tileLayerRef.current = leaflet
          .tileLayer(initialBase.url, {
            maxZoom: initialBase.maxZoom,
            attribution: initialBase.attribution,
          })
          .addTo(map);

        // Clean pane hierarchy: island outline -> roads -> place pins -> town signs
        const roadsPane = map.createPane("explore-roads");
        roadsPane.style.zIndex = "410";
        roadsPane.style.pointerEvents = "none";
        const placesPane = map.createPane("explore-places");
        placesPane.style.zIndex = "420";
        const labelPane = map.createPane("explore-labels");
        labelPane.style.zIndex = "440";

        const roadsRenderer = leaflet.canvas({
          padding: 0.5,
          pane: "explore-roads",
        });
        roadsRenderer.addTo(map);
        const placesRenderer = leaflet.canvas({
          padding: 0.5,
          pane: "explore-places",
        });
        placesRenderer.addTo(map);
        rendererRef.current = placesRenderer;

        // Subtle coastline accent for Unguja, Pemba, and islets
        const islandLayer = leaflet.layerGroup().addTo(map);
        const createdPolygons: Leaflet.Polygon[] = [];
        for (const island of ZANZIBAR_ISLANDS) {
          const poly = leaflet
            .polygon(island.coordinates, {
              color: "#0b5f63",
              weight: island.name === "Islet" ? 0.9 : 1.5,
              opacity: 0.55,
              fillColor: "#0e7490",
              fillOpacity: 0.04,
              interactive: false,
              className: styles.islandShape,
            })
            .addTo(islandLayer);
          createdPolygons.push(poly);
        }
        islandPolygonsRef.current = createdPolygons;

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

        // Clickable town orientation signs at real verified coordinates
        const signMarkers: { marker: Leaflet.Marker; minZoom: number }[] = [];
        for (const sign of TOWN_SIGNS) {
          const marker = leaflet
            .marker(sign.at, {
              pane: "explore-labels",
              interactive: true,
              keyboard: false,
              icon: leaflet.divIcon({
                className: styles.townSign,
                html: `<span><i aria-hidden="true"></i>${sign.name}</span>`,
                iconSize: [130, 22],
                iconAnchor: [65, 11],
              }),
            })
            .addTo(map);
          marker.on("click", () => {
            setActiveQuickArea(sign.quickJump ? sign.id : null);
            map.flyTo(sign.at, sign.flyZoom, {
              duration: prefersReducedMotion() ? 0 : 0.55,
            });
          });
          signMarkers.push({ marker, minZoom: sign.minZoom });
        }

        const roadsGroup = leaflet.layerGroup().addTo(map);
        mainRoadsRef.current = roadsGroup;
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
                color: "#ffffff",
                weight: 4.5,
                opacity: 0.72,
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
                smoothFactor: 1.15,
              })
              .addTo(roadsGroup);
            leaflet
              .polyline(roads as Leaflet.LatLngExpression[][], {
                pane: "explore-roads",
                renderer: roadsRenderer,
                color: "#1e3a5f",
                weight: 2.1,
                opacity: 0.78,
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
                smoothFactor: 1.15,
              })
              .addTo(roadsGroup);
          } catch {
            // Road overlay is optional enhancement; base map tiles always work.
          }
        };

        const syncMinorRoads = () => {
          if (map.getZoom() < MINOR_ROAD_ZOOM) {
            if (minorRoad && roadsGroup.hasLayer(minorRoad)) {
              roadsGroup.removeLayer(minorRoad);
            }
            return;
          }
          if (minorRoad) {
            if (!roadsGroup.hasLayer(minorRoad)) minorRoad.addTo(roadsGroup);
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
                  color: "#475569",
                  weight: 1.1,
                  opacity: 0.4,
                  lineCap: "round",
                  lineJoin: "round",
                  interactive: false,
                  smoothFactor: 1.25,
                },
              );
              if (map.getZoom() >= MINOR_ROAD_ZOOM) {
                minorRoad.addTo(roadsGroup);
              }
            })
            .catch(() => {
              // No minor roads; main roads and basemap stay intact.
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
            const visible = zoom >= sign.minZoom;
            sign.marker.setOpacity(visible ? 1 : 0);
            const el = sign.marker.getElement();
            if (el) el.style.pointerEvents = visible ? "auto" : "none";
          }
          syncMinorRoads();
          setDetail(zoom >= DETAIL_ZOOM);
        };

        void addMainRoads();
        map.on("zoomend", syncZoom);
        syncZoom();

        // Frame Unguja cleanly on initial load
        const compact = window.matchMedia("(max-width: 640px)").matches;
        map.fitBounds(leaflet.latLngBounds(UNGUJA_BOUNDS), {
          paddingTopLeft: compact ? [18, 56] : [26, 56],
          paddingBottomRight: compact ? [18, 36] : [26, 26],
          maxZoom: 10.5,
          animate: false,
        });

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
      tileLayerRef.current = null;
      islandPolygonsRef.current = [];
      mainRoadsRef.current = null;
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

  // Switch basemap tiles (Map / Satellite / Streets) without recreating the map
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !ready) return;

    tileLayerRef.current?.remove();
    const spec = BASEMAPS[basemap];
    tileLayerRef.current = leaflet
      .tileLayer(spec.url, {
        maxZoom: spec.maxZoom,
        attribution: spec.attribution,
      })
      .addTo(map);
    tileLayerRef.current.bringToBack();

    // Keep satellite ocean & reefs completely clear without tinted fill
    const isSat = basemap === "satellite";
    for (const poly of islandPolygonsRef.current) {
      poly.setStyle({
        color: isSat ? "#bae6fd" : "#0b5f63",
        opacity: isSat ? 0.65 : 0.52,
        fillOpacity: isSat ? 0 : 0.04,
      });
    }
  }, [basemap, ready]);

  // Toggle road overlay cleanly
  useEffect(() => {
    const map = mapRef.current;
    const roads = mainRoadsRef.current;
    if (!map || !roads || !ready) return;
    if (showRoads) {
      if (!map.hasLayer(roads)) roads.addTo(map);
    } else if (map.hasLayer(roads)) {
      map.removeLayer(roads);
    }
  }, [ready, showRoads]);

  // Render place markers (curated POIs stand out cleanly above synthetic neighborhood markers)
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

    // Draw neighborhood/area points first, then curated POIs on top so famous sites never hide behind spots
    const ordered = [...filteredPlaces].sort((a, b) => b.id - a.id);

    for (const place of ordered) {
      let marker: Leaflet.Marker | Leaflet.CircleMarker;
      const isCurated = place.id <= CURATED_POI_MAX_ID;

      if (detail) {
        marker = leaflet.marker([place.latitude, place.longitude], {
          pane: "explore-places",
          zIndexOffset: isCurated ? 120 : 0,
          icon: leaflet.divIcon({
            className: styles.marker,
            html: markerGlyphHtml(place),
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            tooltipAnchor: [0, -14],
          }),
          title: `${place.name} — ${place.area}`,
          alt: `${place.name}, ${place.category} in ${place.area}`,
          riseOnHover: true,
        });
        markerKindsRef.current.set(place.id, "icon");
      } else {
        marker = leaflet.circleMarker([place.latitude, place.longitude], {
          radius: isCurated ? 4.8 : 3.2,
          color: "#ffffff",
          weight: isCurated ? 1.5 : 1,
          fillColor: markerColor(place.category),
          fillOpacity: isCurated ? 0.96 : 0.82,
          renderer,
        });
        markerKindsRef.current.set(place.id, "dot");
      }

      marker.bindTooltip(`${place.name} · ${place.area}`, {
        direction: "top",
        offset: [0, -6],
        opacity: 0.96,
      });
      marker.bindPopup(
        buildPopup(place, onMeasureRef.current),
        {
          maxWidth: 300,
          minWidth: 244,
          offset: [0, -14],
          autoPanPadding: [20, 20],
        },
      );
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

  // Highlight selected marker without rebuilding the layer
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const selected = id === selectedId;
      const kind = markerKindsRef.current.get(id);
      const isCurated = id <= CURATED_POI_MAX_ID;
      if (kind === "icon") {
        const iconMarker = marker as Leaflet.Marker;
        iconMarker.setZIndexOffset(selected ? 1000 : isCurated ? 120 : 0);
        const glyph = iconMarker
          .getElement()
          ?.querySelector<HTMLElement>(`.${styles.markerGlyph}`);
        glyph?.classList.toggle(styles.markerSelected, selected);
      } else {
        (marker as Leaflet.CircleMarker).setStyle({
          radius: selected ? 8 : isCurated ? 4.8 : 3.2,
          weight: selected ? 2.5 : isCurated ? 1.5 : 1,
          fillOpacity: selected ? 1 : isCurated ? 0.96 : 0.82,
        });
        if (selected) (marker as Leaflet.CircleMarker).bringToFront();
      }
    });
  }, [detail, filteredPlaces, ready, selectedId]);

  // Reframe map cleanly when user narrows search/category filters
  useEffect(() => {
    if (!ready) return;
    if (filtersActive) {
      fitFilteredPlaces(true);
    }
  }, [filtersActive, fitFilteredPlaces, ready]);

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
          <p className={styles.eyebrow}>
            <Compass size={13} aria-hidden="true" />
            Unguja interactive atlas
          </p>
          <h2 className={styles.title} id="zanzibar-attractions-title">
            Zanzibar attractions &amp; places
          </h2>
          <p className={styles.lead}>
            Explore verified attractions, beaches, spice farms, restaurants,
            stays, wards, and roads pinned to their real locations across Unguja
            — switch to Satellite view anytime to inspect the coastline.
          </p>
        </div>

        <div className={styles.stats}>
          <span className={styles.stat}>
            <strong>{PLACE_COUNT.toLocaleString("en-US")}</strong>
            <span>real places</span>
          </span>
          <span className={styles.stat}>
            <strong>{CURATED_POI_MAX_ID}</strong>
            <span>top landmarks</span>
          </span>
          <span className={styles.stat}>
            <strong>{Object.keys(CATEGORY_NOTES).length}</strong>
            <span>categories</span>
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
              placeholder="Search Unguja places, beaches, roads, hotels or wards…"
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

          <button
            type="button"
            className={`${styles.highlightsToggle} ${
              highlightsOnly ? styles.highlightsToggleActive : ""
            }`}
            aria-pressed={highlightsOnly}
            onClick={toggleHighlights}
          >
            <MapPin size={14} aria-hidden="true" />
            Top landmarks ({CURATED_POI_MAX_ID})
          </button>

          <p className={styles.resultCount} aria-live="polite">
            {filtersActive
              ? `${filteredPlaces.length} of ${PLACE_COUNT}`
              : `${PLACE_COUNT} mapped`}
          </p>

          {filtersActive ? (
            <button
              type="button"
              className={styles.reset}
              onClick={resetFilters}
            >
              Reset
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
            const dotColor =
              item.id === "all"
                ? undefined
                : GROUP_COLORS[item.id as PlaceGroupId];
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                onClick={() => changeGroup(item.id)}
                title={item.description}
              >
                {dotColor ? (
                  <i
                    className={styles.chipDot}
                    style={{ background: active ? "#ffffff" : dotColor }}
                    aria-hidden="true"
                  />
                ) : null}
                <span>{item.label}</span>
                <span className={styles.chipCount}>
                  {GROUP_COUNTS.get(item.id) ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={styles.quickAreas}
          role="group"
          aria-label="Jump to Unguja regions"
        >
          <span className={styles.quickAreasLabel}>
            <Navigation size={12} aria-hidden="true" />
            Fly to:
          </span>
          <button
            type="button"
            className={`${styles.areaPill} ${
              activeQuickArea === null && islandScope === "unguja"
                ? styles.areaPillActive
                : ""
            }`}
            onClick={() => fitUnguja(true)}
            disabled={!ready}
          >
            All Unguja
          </button>
          {QUICK_AREAS.map((town) => (
            <button
              key={town.id}
              type="button"
              className={`${styles.areaPill} ${
                activeQuickArea === town.id ? styles.areaPillActive : ""
              }`}
              onClick={() => flyToQuickArea(town)}
              disabled={!ready}
            >
              {town.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.mapCard}>
          <div
            ref={containerRef}
            className={styles.map}
            role="region"
            aria-label="Interactive map of Unguja and Zanzibar places"
          />

          {/* Top-left scope controls */}
          <div className={styles.mapTop}>
            <button
              type="button"
              className={`${styles.mapAction} ${
                islandScope === "unguja" && !activeQuickArea
                  ? styles.mapActionActive
                  : ""
              }`}
              onClick={() => {
                setSelectedId(null);
                mapRef.current?.closePopup();
                fitUnguja(true);
              }}
              disabled={!ready}
            >
              <MapPin size={13} aria-hidden="true" />
              Unguja
            </button>
            <button
              type="button"
              className={`${styles.mapAction} ${
                islandScope === "archipelago" ? styles.mapActionActive : ""
              }`}
              onClick={() => {
                setSelectedId(null);
                mapRef.current?.closePopup();
                fitArchipelago();
              }}
              disabled={!ready}
            >
              <Locate size={13} aria-hidden="true" />
              Unguja &amp; Pemba
            </button>
            {filtersActive ? (
              <button
                type="button"
                className={styles.mapAction}
                onClick={() => {
                  setSelectedId(null);
                  mapRef.current?.closePopup();
                  fitFilteredPlaces(true);
                }}
                disabled={!ready}
              >
                Fit results
              </button>
            ) : null}
          </div>

          {/* Top-right basemap + road toggle */}
          <div className={styles.mapStyleBar} role="group" aria-label="Map style">
            {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
              <button
                key={id}
                type="button"
                className={`${styles.styleBtn} ${
                  basemap === id ? styles.styleBtnActive : ""
                }`}
                aria-pressed={basemap === id}
                onClick={() => setBasemap(id)}
                disabled={!ready}
              >
                {BASEMAPS[id].label}
              </button>
            ))}
            <button
              type="button"
              className={`${styles.styleBtn} ${
                showRoads ? styles.styleBtnActive : ""
              }`}
              aria-pressed={showRoads}
              onClick={() => setShowRoads((prev) => !prev)}
              disabled={!ready}
              title="Toggle Zanzibar road network overlay"
            >
              Roads
            </button>
          </div>

          {!ready && !mapError ? (
            <div className={styles.mapStatus}>
              Loading the Unguja interactive map…
            </div>
          ) : null}
          {mapError ? (
            <div className={styles.mapStatus} role="status">
              The map could not load. Use the place list to explore Unguja.
            </div>
          ) : null}

          {/* Compact collapsible map key (never blocks Unguja's south coast) */}
          {ready ? (
            <div className={styles.legendDock}>
              {showLegend ? (
                <div className={styles.legend} role="group" aria-label="Map key">
                  <div className={styles.legendHead}>
                    <span>Map key</span>
                    <button
                      type="button"
                      className={styles.legendClose}
                      onClick={() => setShowLegend(false)}
                      aria-label="Close map key"
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </div>
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
                      Town (tap to fly)
                    </span>
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                className={styles.legendToggle}
                aria-expanded={showLegend}
                onClick={() => setShowLegend((prev) => !prev)}
              >
                <Layers size={13} aria-hidden="true" />
                {showLegend ? "Hide key" : "Map key"}
              </button>
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
              <div className={styles.selectedActions}>
                {onMeasurePlace ? (
                  <button
                    type="button"
                    className={styles.measureAction}
                    onClick={() => onMeasurePlace(selectedPlace)}
                  >
                    <RouteIcon size={13} aria-hidden="true" />
                    Measure trip here
                  </button>
                ) : null}
                <a
                  className={styles.mapsLink}
                  href={tripPlaceMapsUrl(selectedPlace)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  Google Maps
                </a>
              </div>
            </div>
          ) : (
            <div className={styles.hintCard}>
              <span className={styles.hintIcon} aria-hidden="true">
                <MapPin size={16} />
              </span>
              <p>
                Click any pin, town label, or list item to zoom into its real
                spot on Unguja and inspect coordinates or measure a route.
              </p>
            </div>
          )}

          <div className={styles.listPanel}>
            <div className={styles.listHead}>
              <h3 className={styles.listTitle}>Places on map</h3>
              <span className={styles.listCount}>
                {filteredPlaces.length.toLocaleString("en-US")}
              </span>
            </div>

            {visiblePlaces.length > 0 ? (
              <ul className={styles.list}>
                {visiblePlaces.map((place, index) => {
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
                {visibleCount < rankedPlaces.length ? (
                  <li className={styles.loadMoreRow}>
                    <button
                      type="button"
                      className={styles.loadMoreBtn}
                      onClick={() =>
                        setVisibleCount((prev) => prev + LIST_PAGE_SIZE)
                      }
                    >
                      Show more ({rankedPlaces.length - visibleCount} remaining)
                    </button>
                  </li>
                ) : null}
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

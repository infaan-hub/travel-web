"use client";

import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { routeAPI } from "@/lib/api/client";
import {
  ZANZIBAR_ISLANDS,
  ZANZIBAR_ISLAND_LABELS,
} from "@/lib/zanzibar-outline";
import { ZANZIBAR_BOUNDS, ZANZIBAR_CENTER, isInZanzibar } from "@/lib/zanzibar";
import styles from "@/components/trip-place-picker.module.css";

type Props = {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
};

const ROUTE_CASING = "#1e293b";
const ROUTE_GREEN = "#15803d";
const ROUTE_BLUE = "#08428c";
const MINOR_ROAD_ZOOM = 12;

// Symbol sizes and styles
const SYMBOL_SIZE = 12;
const SYMBOL_BORDER = 3;
const SYMBOL_GAP = 6;

export default function TripRouteOverlayMap({
  originLat,
  originLng,
  destinationLat,
  destinationLng,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const roadsRendererRef = useRef<Leaflet.Canvas | null>(null);
  const routeRendererRef = useRef<Leaflet.Canvas | null>(null);
  const roadsControllerRef = useRef<AbortController | null>(null);
  const originMarkerRef = useRef<Leaflet.Layer | null>(null);
  const destMarkerRef = useRef<Leaflet.Layer | null>(null);
  const routeLayerRef = useRef<Leaflet.LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      leafletRef.current = L;

      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false,
        zoomSnap: 0.25,
        maxBounds: ZANZIBAR_BOUNDS,
        maxBoundsViscosity: 1,
        scrollWheelZoom: false,
        center: ZANZIBAR_CENTER,
        zoom: 9,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      map.attributionControl.addAttribution(
        'Road overlay © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors (ODbL)',
      );

      const roadsPane = map.createPane("trip-roads");
      roadsPane.style.zIndex = "410";
      roadsPane.style.pointerEvents = "none";
      const routePane = map.createPane("trip-route");
      routePane.style.zIndex = "430";
      routePane.style.pointerEvents = "none";

      const roadsRenderer = L.canvas({ padding: 0.5, pane: "trip-roads" });
      const routeRenderer = L.canvas({ padding: 0.5, pane: "trip-route" });
      roadsRenderer.addTo(map);
      routeRenderer.addTo(map);
      roadsRendererRef.current = roadsRenderer;
      routeRendererRef.current = routeRenderer;

      const islandLayer = L.layerGroup().addTo(map);
      for (const island of ZANZIBAR_ISLANDS) {
        L.polygon(island.coordinates, {
          color: "#0b5f63",
          weight: island.name === "Islet" ? 1 : 1.8,
          opacity: 0.85,
          fillColor: "#0f766e",
          fillOpacity: 0.16,
          interactive: false,
          className: styles.islandShape,
        }).addTo(islandLayer);
      }
      const islandLabels: Leaflet.Marker[] = [];
      for (const label of ZANZIBAR_ISLAND_LABELS) {
        const marker = L.marker(label.at, {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: styles.islandLabel,
            html: `<span>${label.name}</span>`,
            iconSize: [120, 18],
            iconAnchor: [60, 9],
          }),
        }).addTo(islandLayer);
        islandLabels.push(marker);
      }
      const syncIslandLabels = () => {
        const opacity = map.getZoom() < 9.5 ? 1 : 0;
        for (const marker of islandLabels) marker.setOpacity(opacity);
      };
      map.on("zoomend", syncIslandLabels);
      syncIslandLabels();

      let minorRoad: Leaflet.Polyline | null = null;
      let minorRoadLoading = false;

      const addMainRoads = async () => {
        try {
          roadsControllerRef.current = new AbortController();
          const response = await fetch("/data/zanzibar-roads-main.json", {
            signal: roadsControllerRef.current.signal,
          });
          if (!cancelled && response.ok) {
            const payload = (await response.json()) as {
              roads?: [number, number][][];
            };
            const roads = payload.roads ?? [];
            if (roads.length) {
              L.polyline(roads as Leaflet.LatLngExpression[][], {
                pane: "trip-roads",
                renderer: roadsRenderer,
                color: "#000000",
                weight: 5,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
                smoothFactor: 1.1,
              }).addTo(map);
            }
          }
        } catch {
          // Roads are an enhancement; OSM tiles still work without them.
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
          signal: roadsControllerRef.current?.signal,
        })
          .then((response) =>
            response.ok ? response.json() : null,
          )
          .then(
            (payload: { roads?: [number, number][][] } | null) => {
              if (cancelled || !payload?.roads?.length) return;
              minorRoad = L.polyline(
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
            // No minor roads; main roads and base map remain.
          })
          .finally(() => {
            minorRoadLoading = false;
          });
      };

      void addMainRoads();
      map.on("zoomend", syncMinorRoads);
      syncMinorRoads();

      if (isInZanzibar(originLat, originLng)) {
        originMarkerRef.current = L.marker([originLat, originLng], {
          icon: L.divIcon({
            className: "trip-symbol trip-symbol-origin",
            html: `
              <div style="
                width: ${SYMBOL_SIZE * 2 + SYMBOL_BORDER}px;
                height: ${SYMBOL_SIZE * 2 + SYMBOL_BORDER}px;
                background: #15803d;
                border: ${SYMBOL_BORDER}px solid #fff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${SYMBOL_SIZE / 2 + SYMBOL_BORDER}px;
                color: #fff;
                font-weight: bold;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              ">
                <span>S</span>
              </div>
            `,
            iconSize: [SYMBOL_SIZE * 2 + SYMBOL_BORDER, SYMBOL_SIZE * 2 + SYMBOL_BORDER],
            iconAnchor: [SYMBOL_SIZE + SYMBOL_BORDER, SYMBOL_SIZE + SYMBOL_BORDER],
          }),
        }).addTo(map);
        originMarkerRef.current.bindTooltip("Origin Start").addTo(map);
      }

      if (isInZanzibar(destinationLat, destinationLng)) {
        destMarkerRef.current = L.marker([destinationLat, destinationLng], {
          icon: L.divIcon({
            className: "trip-symbol trip-symbol-destination",
            html: `
              <div style="
                width: ${SYMBOL_SIZE * 2 + SYMBOL_BORDER}px;
                height: ${SYMBOL_SIZE * 2 + SYMBOL_BORDER}px;
                background: #dc2626;
                border: ${SYMBOL_BORDER}px solid #fff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${SYMBOL_SIZE / 2 + SYMBOL_BORDER}px;
                color: #fff;
                font-weight: bold;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              ">
                <span>D</span>
              </div>
            `,
            iconSize: [SYMBOL_SIZE * 2 + SYMBOL_BORDER, SYMBOL_SIZE * 2 + SYMBOL_BORDER],
            iconAnchor: [SYMBOL_SIZE + SYMBOL_BORDER, SYMBOL_SIZE + SYMBOL_BORDER],
          }),
        }).addTo(map);
        destMarkerRef.current.bindTooltip("Destination End").addTo(map);
      }

      // Calculate and draw route automatically
      try {
        const res = await routeAPI.calculate({
          origin_lat: originLat,
          origin_lng: originLng,
          destination_lat: destinationLat,
          destination_lng: destinationLng,
        });
        const geometry = res.data?.geometry;
        if (!cancelled && Array.isArray(geometry) && geometry.length > 1) {
          const latLngs = geometry.map((point: [number, number]) =>
            L.latLng(point[0], point[1]),
          );

          const routeLayer = L.layerGroup().addTo(map);
          routeLayerRef.current = routeLayer;

          // Casing (shadow) behind route
          L.polyline(latLngs, {
            pane: "trip-route",
            renderer: routeRenderer,
            color: ROUTE_CASING,
            weight: 10,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
            interactive: false,
          }).addTo(routeLayer);

          // Route line
          const source = res.data?.source;
          L.polyline(latLngs, {
            pane: "trip-route",
            renderer: routeRenderer,
            color: ROUTE_GREEN,
            weight: 7,
            opacity: 1,
            dashArray: source === "osrm" ? undefined : "8 10",
            lineCap: "round",
            lineJoin: "round",
            interactive: false,
          }).addTo(routeLayer);

          const bounds = L.latLngBounds([
            [originLat, originLng],
            [destinationLat, destinationLng],
          ]);
          for (const point of latLngs) bounds.extend(point);

          map.fitBounds(bounds, {
            padding: [44, 44],
            maxZoom: 14,
            animate: true,
          });
        }
      } catch {
        // Fallback: straight line
        if (!cancelled) {
          const routeLayer = L.layerGroup().addTo(map);
          routeLayerRef.current = routeLayer;
          L.polyline(
            [
              L.latLng(originLat, originLng),
              L.latLng(destinationLat, destinationLng),
            ],
            {
              pane: "trip-route",
              renderer: routeRenderer,
              color: ROUTE_BLUE,
              weight: 3,
              opacity: 0.7,
              dashArray: "6 6",
              lineCap: "round",
              lineJoin: "round",
              interactive: false,
            },
          ).addTo(routeLayer);
          const bounds = L.latLngBounds([
            [originLat, originLng],
            [destinationLat, destinationLng],
          ]);

          map.fitBounds(bounds, {
            padding: [44, 44],
            maxZoom: 14,
            animate: true,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      roadsControllerRef.current?.abort();
      const map = mapRef.current;
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, [originLat, originLng, destinationLat, destinationLng]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 22,
        overflow: "hidden",
        border: "1px solid rgba(8,66,140,0.25)",
      }}
    />
  );
}
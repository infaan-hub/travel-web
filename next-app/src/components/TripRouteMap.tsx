"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { routeAPI } from "@/lib/api/client";

type Props = {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
};

export default function TripRouteMap({
  originLat,
  originLng,
  destinationLat,
  destinationLng,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: any = null;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const origin = L.latLng(originLat, originLng);
      const destination = L.latLng(destinationLat, destinationLng);

      L.circleMarker(origin, {
        radius: 8,
        color: "#15803d",
        fillColor: "#15803d",
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindTooltip("Origin", { permanent: false })
        .addTo(map);

      L.circleMarker(destination, {
        radius: 8,
        color: "#dc2626",
        fillColor: "#dc2626",
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindTooltip("Destination", { permanent: false })
        .addTo(map);

      try {
        const res = await routeAPI.calculate({
          origin_lat: originLat,
          origin_lng: originLng,
          destination_lat: destinationLat,
          destination_lng: destinationLng,
        });
        const geometry = res.data?.geometry;
        if (Array.isArray(geometry) && geometry.length > 1) {
          const latLngs = geometry.map((point: [number, number]) => L.latLng(point[0], point[1]));
          L.polyline(latLngs, { color: "#08428c", weight: 4, opacity: 0.9 }).addTo(map);
        }
      } catch {
        L.polyline([origin, destination], { color: "#08428c", weight: 3, dashArray: "6 6", opacity: 0.7 }).addTo(map);
      }

      const bounds = L.latLngBounds([origin, destination]);
      map.fitBounds(bounds, { padding: [40, 40] });
    })();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
      }
    };
  }, [originLat, originLng, destinationLat, destinationLng]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 320, borderRadius: 16, overflow: "hidden" }}
    />
  );
}
"use client";

import { useState } from "react";
import TripPlaceMapPicker, {
  type TripMapViewerRoute,
} from "@/components/TripPlaceMapPicker";
import type { TripPlace } from "@/lib/trips";

type Props = {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  originLabel?: string;
  destinationLabel?: string;
  /** Show only origin pin, road route line, and destination pin without Zanzibar POI clutter. */
  routeOnly?: boolean;
};

/**
 * Trip route map. In standard mode it reuses the company trip composer map so
 * roads, place pins, symbols and legend stay identical; in `routeOnly` mode it
 * displays a clean focused route with only origin, road line, and destination.
 */
export default function TripRouteOverlayMap({
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  originLabel,
  destinationLabel,
  routeOnly = false,
}: Props) {
  const [selectedPlace, setSelectedPlace] = useState<TripPlace | null>(null);

  const viewerRoute: TripMapViewerRoute = {
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    originLabel,
    destinationLabel,
  };

  return (
    <TripPlaceMapPicker
      key={`${routeOnly ? "route" : "full"}:${originLat}:${originLng}:${destinationLat}:${destinationLng}:${originLabel ?? ""}:${destinationLabel ?? ""}`}
      latitude={selectedPlace?.latitude ?? null}
      longitude={selectedPlace?.longitude ?? null}
      readOnly
      routeOnly={routeOnly}
      viewerRoute={viewerRoute}
      onSelectPlace={setSelectedPlace}
      onPickPoint={() => {}}
      onClearPoint={() => setSelectedPlace(null)}
    />
  );
}

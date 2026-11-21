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
  /** When true, origin represents a continuously moving live GPS position instead of a fixed pin. */
  liveOrigin?: boolean;
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
  liveOrigin = false,
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
      key={routeOnly ? "route" : "full"}
      latitude={selectedPlace?.latitude ?? null}
      longitude={selectedPlace?.longitude ?? null}
      readOnly
      routeOnly={routeOnly}
      liveOrigin={liveOrigin}
      viewerRoute={viewerRoute}
      onSelectPlace={setSelectedPlace}
      onPickPoint={() => {}}
      onClearPoint={() => setSelectedPlace(null)}
    />
  );
}

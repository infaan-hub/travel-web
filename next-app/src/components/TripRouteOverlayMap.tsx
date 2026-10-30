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
};

/**
 * Customer-facing trip map. It reuses the company trip composer map so the
 * roads, place pins, symbols and legend stay identical, but runs it in
 * read-only mode with the trip's fixed road route.
 */
export default function TripRouteOverlayMap({
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  originLabel,
  destinationLabel,
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
      key={`${originLat}:${originLng}:${destinationLat}:${destinationLng}:${originLabel ?? ""}:${destinationLabel ?? ""}`}
      latitude={selectedPlace?.latitude ?? null}
      longitude={selectedPlace?.longitude ?? null}
      readOnly
      viewerRoute={viewerRoute}
      onSelectPlace={setSelectedPlace}
      onPickPoint={() => {}}
      onClearPoint={() => setSelectedPlace(null)}
    />
  );
}

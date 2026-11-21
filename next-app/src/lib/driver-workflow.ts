export type BookingStatusValue =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type DriverTripStage =
  | "pending"
  | "confirmed"
  | "en_route_to_origin"
  | "arrived_at_origin"
  | "in_trip"
  | "reached_destination"
  | "completed"
  | "cancelled";

export type DriverTripAction =
  | "confirm"
  | "start"
  | "arrived"
  | "picked_up"
  | "reached_destination"
  | "finalize"
  | "location";

export type ActiveDriverPageStage = "start" | "pickup" | "trip" | "finalize";

export const DRIVER_STAGE_LABELS: Record<DriverTripStage, string> = {
  pending: "Pending confirmation",
  confirmed: "Confirmed · ready to start",
  en_route_to_origin: "Heading to pickup",
  arrived_at_origin: "Arrived at pickup",
  in_trip: "On live trip",
  reached_destination: "Reached destination",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const DRIVER_STAGE_ORDER: ReadonlyArray<{
  key: ActiveDriverPageStage;
  stage: DriverTripStage;
  label: string;
  shortLabel: string;
  path: string;
}> = [
  {
    key: "start",
    stage: "en_route_to_origin",
    label: "Heading to Origin",
    shortLabel: "Start",
    path: "/driver/start/",
  },
  {
    key: "pickup",
    stage: "arrived_at_origin",
    label: "Pickup Customer",
    shortLabel: "Pickup",
    path: "/driver/pickup/",
  },
  {
    key: "trip",
    stage: "in_trip",
    label: "Origin to Destination",
    shortLabel: "Trip",
    path: "/driver/trip/",
  },
  {
    key: "finalize",
    stage: "reached_destination",
    label: "Finalize Trip",
    shortLabel: "Finalize",
    path: "/driver/finalize/",
  },
];

const VALID_STAGES = new Set<string>([
  "pending",
  "confirmed",
  "en_route_to_origin",
  "arrived_at_origin",
  "in_trip",
  "reached_destination",
  "completed",
  "cancelled",
]);

/**
 * Resolves the canonical driver execution stage from status + optional driver_stage,
 * staying backward-compatible with older records where driver_stage is null.
 */
export function resolveDriverStage(input: {
  status?: string | null;
  driver_stage?: string | null;
  driverStage?: string | null;
}): DriverTripStage {
  const status = (input.status || "pending").toLowerCase();
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  if (status === "pending") return "pending";

  const explicit = (input.driver_stage ?? input.driverStage ?? "").trim().toLowerCase();
  if (explicit && VALID_STAGES.has(explicit)) {
    if (status === "confirmed" && explicit !== "confirmed") return "confirmed";
    return explicit as DriverTripStage;
  }

  if (status === "confirmed") return "confirmed";
  if (status === "in_progress") return "en_route_to_origin";
  return "pending";
}

export function isActiveExecutionStage(stage: DriverTripStage): boolean {
  return (
    stage === "en_route_to_origin" ||
    stage === "arrived_at_origin" ||
    stage === "in_trip" ||
    stage === "reached_destination"
  );
}

export function driverStageRoute(bookingId: number | string, stage: DriverTripStage): string {
  const suffix = `?booking=${encodeURIComponent(String(bookingId))}`;
  switch (stage) {
    case "en_route_to_origin":
      return `/driver/start/${suffix}`;
    case "arrived_at_origin":
      return `/driver/pickup/${suffix}`;
    case "in_trip":
      return `/driver/trip/${suffix}`;
    case "reached_destination":
      return `/driver/finalize/${suffix}`;
    default:
      return "/driver/bookings/";
  }
}

export function stageStepIndex(stage: DriverTripStage): number {
  switch (stage) {
    case "en_route_to_origin":
      return 0;
    case "arrived_at_origin":
      return 1;
    case "in_trip":
      return 2;
    case "reached_destination":
      return 3;
    case "completed":
      return 4;
    default:
      return -1;
  }
}

export function validateDriverTransition(
  currentStatus: string,
  currentDriverStage: string | null | undefined,
  action: DriverTripAction,
): { ok: true; nextStatus: BookingStatusValue; nextStage: DriverTripStage } | { ok: false; reason: string } {
  const stage = resolveDriverStage({ status: currentStatus, driverStage: currentDriverStage });

  switch (action) {
    case "confirm":
      if (stage !== "pending") {
        return { ok: false, reason: "Only pending trips can be confirmed." };
      }
      return { ok: true, nextStatus: "confirmed", nextStage: "confirmed" };

    case "start":
      if (stage !== "confirmed") {
        return { ok: false, reason: "Confirm the trip before starting navigation to pickup." };
      }
      return { ok: true, nextStatus: "in_progress", nextStage: "en_route_to_origin" };

    case "arrived":
      if (stage !== "en_route_to_origin") {
        return { ok: false, reason: "Start the trip to pickup before marking arrival." };
      }
      return { ok: true, nextStatus: "in_progress", nextStage: "arrived_at_origin" };

    case "picked_up":
      if (stage !== "arrived_at_origin" && stage !== "en_route_to_origin") {
        return { ok: false, reason: "Arrive at pickup before confirming customer pickup." };
      }
      return { ok: true, nextStatus: "in_progress", nextStage: "in_trip" };

    case "reached_destination":
      if (stage !== "in_trip") {
        return { ok: false, reason: "Mark the passenger picked up before reaching destination." };
      }
      return { ok: true, nextStatus: "in_progress", nextStage: "reached_destination" };

    case "finalize":
      if (
        stage !== "reached_destination" &&
        stage !== "in_trip" &&
        currentStatus !== "in_progress"
      ) {
        return { ok: false, reason: "Only active trips can be finalized and completed." };
      }
      return { ok: true, nextStatus: "completed", nextStage: "completed" };

    case "location":
      if (!isActiveExecutionStage(stage)) {
        return { ok: false, reason: "Live location updates apply only to active trips." };
      }
      return { ok: true, nextStatus: "in_progress", nextStage: stage };
  }
}

export type GeoPoint = { lat: number; lng: number };
export type TimedGeoPoint = GeoPoint & { at: number };

export const LIVE_REROUTE_MIN_METERS = 12;
export const LIVE_REROUTE_MIN_INTERVAL_MS = 4_000;
export const LIVE_REROUTE_FAST_METERS = 60;
export const LIVE_SYNC_MIN_METERS = 15;
export const LIVE_SYNC_MIN_INTERVAL_MS = 8_000;
export const LIVE_SYNC_HEARTBEAT_METERS = 5;
export const LIVE_SYNC_HEARTBEAT_INTERVAL_MS = 15_000;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusM = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Forward compass bearing in degrees [0, 360) from point 1 to point 2
 * (0 = North, 90 = East, 180 = South, 270 = West).
 */
export function computeBearingDegrees(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lng2 - lng1);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const raw = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Math.round(raw) % 360;
}

/**
 * Resolves live vehicle heading: prefers native GPS heading when moving,
 * falls back to computed bearing once the driver moves >= 3 m, and retains
 * the previous heading while stopped so the icon never jitters in place.
 */
export function resolveLiveHeadingDegrees(params: {
  coordsHeading?: number | null;
  speedKmh?: number | null;
  prev?: GeoPoint | null;
  next: GeoPoint;
  fallbackHeading?: number | null;
}): number | null {
  const { coordsHeading, speedKmh, prev, next, fallbackHeading = null } = params;
  if (
    typeof coordsHeading === "number" &&
    Number.isFinite(coordsHeading) &&
    coordsHeading >= 0 &&
    coordsHeading <= 360 &&
    (speedKmh == null || speedKmh >= 2)
  ) {
    return Math.round(coordsHeading) % 360;
  }
  if (prev && haversineMeters(prev.lat, prev.lng, next.lat, next.lng) >= 3) {
    return computeBearingDegrees(prev.lat, prev.lng, next.lat, next.lng);
  }
  return fallbackHeading;
}

/**
 * Computes live travel speed in km/h from device speed (m/s) when available,
 * or derives it from consecutive live GPS fixes when moving >= 3 m over >= 1 s.
 */
export function estimateLiveSpeedKmh(params: {
  coordsSpeedMps?: number | null;
  prev?: TimedGeoPoint | null;
  next: TimedGeoPoint;
}): number | null {
  const { coordsSpeedMps, prev, next } = params;
  if (
    typeof coordsSpeedMps === "number" &&
    Number.isFinite(coordsSpeedMps) &&
    coordsSpeedMps >= 0
  ) {
    return Math.min(180, Math.round(coordsSpeedMps * 3.6));
  }
  if (!prev) return null;
  const elapsedSec = (next.at - prev.at) / 1000;
  if (elapsedSec < 1 || elapsedSec > 60) return null;
  const meters = haversineMeters(prev.lat, prev.lng, next.lat, next.lng);
  if (meters < 3) return 0;
  const kmh = (meters / elapsedSec) * 3.6;
  if (!Number.isFinite(kmh) || kmh > 180) return null;
  return Math.round(kmh);
}

/**
 * Decides when to recalculate the live road polyline from the driver's
 * current GPS location to their pickup/destination target.
 */
export function shouldRecalculateLiveRoute(
  prev: TimedGeoPoint | null,
  next: GeoPoint,
  nowMs: number,
): boolean {
  if (!prev) return true;
  const movedM = haversineMeters(prev.lat, prev.lng, next.lat, next.lng);
  if (movedM >= LIVE_REROUTE_FAST_METERS) return true;
  return movedM >= LIVE_REROUTE_MIN_METERS && nowMs - prev.at >= LIVE_REROUTE_MIN_INTERVAL_MS;
}

/**
 * Decides when to push the driver's live GPS coordinates to the backend
 * (immediate on first live fix, brisk while moving, gentle heartbeat for slow motion).
 */
export function shouldSyncDriverLocation(
  prev: TimedGeoPoint | null,
  next: GeoPoint,
  nowMs: number,
): boolean {
  if (!prev) return true;
  const movedM = haversineMeters(prev.lat, prev.lng, next.lat, next.lng);
  const elapsedMs = nowMs - prev.at;
  if (movedM >= LIVE_SYNC_MIN_METERS && elapsedMs >= LIVE_SYNC_MIN_INTERVAL_MS) {
    return true;
  }
  return movedM >= LIVE_SYNC_HEARTBEAT_METERS && elapsedMs >= LIVE_SYNC_HEARTBEAT_INTERVAL_MS;
}

/**
 * Guards against out-of-order/stale cached browser geolocation fixes overwriting
 * a newer live driver position.
 */
export function shouldAcceptGpsTimestamp(
  lastTimestampMs: number,
  incomingTimestampMs: number | null | undefined,
): boolean {
  if (lastTimestampMs <= 0) return true;
  if (
    typeof incomingTimestampMs !== "number" ||
    !Number.isFinite(incomingTimestampMs) ||
    incomingTimestampMs <= 0
  ) {
    return true;
  }
  return incomingTimestampMs >= lastTimestampMs;
}

export function formatDistanceLabel(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km) || km < 0) return "—";
  if (km < 1) return `${Math.max(10, Math.round(km * 1000))} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function formatDurationLabel(mins: number | null | undefined): string {
  if (mins == null || !Number.isFinite(mins) || mins <= 0) return "—";
  const rounded = Math.max(1, Math.round(mins));
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rem = rounded % 60;
  return rem === 0 ? `${hours} h` : `${hours} h ${rem} min`;
}

/**
 * Every active driver (both public hire and company private hire drivers) can see:
 * 1) bookings directly assigned to them, and
 * 2) any pending booking that a company decided to share publicly.
 */
export function buildDriverBookingsWhere(driverId: number) {
  return {
    OR: [
      { driverId },
      { isPublic: true, status: "pending" as const },
    ],
  };
}

/**
 * Filter used when a driver confirms a pending trip: either assigned directly
 * to that driver or shared publicly by a company.
 */
export function buildDriverConfirmFilter(driverId: number) {
  return {
    OR: [{ driverId }, { isPublic: true }],
  };
}

/**
 * True when a driver is viewing a company-shared public pending booking that
 * has not yet been assigned/claimed by them (customer contact stays masked until confirmed).
 */
export function isUnclaimedPublicBookingOffer(
  booking: { isPublic: boolean; status: string; driverId: number | null },
  viewingDriverId: number,
): boolean {
  return Boolean(
    booking.isPublic &&
      booking.status === "pending" &&
      booking.driverId !== viewingDriverId,
  );
}

/**
 * Determines which vehicleId should be stored when a driver confirms a booking.
 * When a new driver claims/confirms a public booking, their own/assigned vehicle
 * replaces the previous driver's vehicle (or clears it if they have none yet)
 * so customers and companies never see stale vehicle details.
 */
export function resolveConfirmedVehicleId(params: {
  existingDriverId: number | null;
  existingVehicleId: number | null;
  confirmingDriverId: number;
  confirmingDriverVehicleId: number | null;
}): { shouldUpdateVehicle: boolean; vehicleId: number | null } {
  const isNewDriver = params.existingDriverId !== params.confirmingDriverId;
  if (isNewDriver) {
    return {
      shouldUpdateVehicle: true,
      vehicleId: params.confirmingDriverVehicleId,
    };
  }
  if (!params.existingVehicleId && params.confirmingDriverVehicleId) {
    return {
      shouldUpdateVehicle: true,
      vehicleId: params.confirmingDriverVehicleId,
    };
  }
  return {
    shouldUpdateVehicle: false,
    vehicleId: params.existingVehicleId,
  };
}

/**
 * Payload applied when a company switches a pending booking between public
 * dispatch and private company assignment. Making a booking public clears its
 * assigned driver and vehicle so it waits in pending until a confirming driver
 * claims it with their own driver profile and vehicle.
 */
export function buildCompanyPublicToggleData(params: {
  isPublic: boolean;
  serviceDriverId: number | null;
  serviceVehicleId: number | null;
}): {
  isPublic: boolean;
  driverId: number | null;
  vehicleId: number | null;
  driverStage: "pending";
} {
  if (params.isPublic) {
    return {
      isPublic: true,
      driverId: null,
      vehicleId: null,
      driverStage: "pending",
    };
  }
  return {
    isPublic: false,
    driverId: params.serviceDriverId,
    vehicleId: params.serviceVehicleId,
    driverStage: "pending",
  };
}

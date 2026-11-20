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

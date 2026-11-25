import { formatDistanceLabel, formatDurationLabel } from "@/lib/driver-workflow";

export type DriverShareEndpoint = {
  label: string;
  lat?: number | null;
  lng?: number | null;
};

export type DriverTripWhatsAppPayload = {
  driverName: string;
  driverPhone?: string | null;
  driverLicense?: string | null;
  companyName?: string | null;
  vehicleName?: string | null;
  vehiclePlate?: string | null;
  vehicleCategory?: string | null;
  vehicleSeats?: number | null;
  origin: DriverShareEndpoint;
  destination: DriverShareEndpoint;
  distanceKm?: number | null;
  durationMins?: number | null;
  scheduleText?: string | null;
  passengers?: number | string | null;
  fareEstimate?: string | null;
  notes?: string | null;
};

function hasValidCoords(point: DriverShareEndpoint): boolean {
  return (
    typeof point.lat === "number" &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  );
}

/**
 * Builds a Google Maps driving route URL from origin to destination.
 * Uses exact coordinates when available and falls back to place names.
 */
export function buildGoogleMapsTripRouteUrl(
  origin: DriverShareEndpoint,
  destination: DriverShareEndpoint,
): string {
  const originParam = hasValidCoords(origin)
    ? `${origin.lat},${origin.lng}`
    : `${origin.label.trim()}, Zanzibar`;
  const destParam = hasValidCoords(destination)
    ? `${destination.lat},${destination.lng}`
    : `${destination.label.trim()}, Zanzibar`;

  const params = new URLSearchParams({
    api: "1",
    origin: originParam,
    destination: destParam,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildGoogleMapsPinUrl(point: DriverShareEndpoint): string {
  const query = hasValidCoords(point)
    ? `${point.lat},${point.lng}`
    : `${point.label.trim()}, Zanzibar`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Composes a complete, customer-ready WhatsApp message detailing the driver,
 * vehicle, origin -> destination route, distance/ETA, and Google Maps links.
 */
export function buildDriverTripWhatsAppMessage(payload: DriverTripWhatsAppPayload): string {
  const routeMapUrl = buildGoogleMapsTripRouteUrl(payload.origin, payload.destination);
  const pickupPinUrl = buildGoogleMapsPinUrl(payload.origin);
  const destinationPinUrl = buildGoogleMapsPinUrl(payload.destination);

  const vehicleSpecs = [
    payload.vehicleCategory?.trim(),
    payload.vehicleSeats && payload.vehicleSeats > 0 ? `${payload.vehicleSeats} seats` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const lines: string[] = [
    "*PRIVATE HIRE TRIP DETAILS — TRAVEL.*",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    "*DRIVER INFORMATION*",
    `• Driver: ${payload.driverName.trim() || "Verified Driver"}`,
  ];

  if (payload.driverPhone?.trim()) {
    lines.push(`• Phone / WhatsApp: ${payload.driverPhone.trim()}`);
  }
  if (payload.driverLicense?.trim()) {
    lines.push(`• License ID: ${payload.driverLicense.trim()}`);
  }
  if (payload.companyName?.trim()) {
    lines.push(`• Operator: ${payload.companyName.trim()}`);
  }

  lines.push("", "*VEHICLE DETAILS*");
  lines.push(`• Vehicle: ${payload.vehicleName?.trim() || "Private Hire Vehicle"}`);
  if (payload.vehiclePlate?.trim()) {
    lines.push(`• Plate Number: ${payload.vehiclePlate.trim()}`);
  }
  if (vehicleSpecs) {
    lines.push(`• Class & Capacity: ${vehicleSpecs}`);
  }

  lines.push("", "*TRIP ROUTE & JOURNEY*");
  lines.push(`• Pickup (Origin): ${payload.origin.label.trim()}`);
  lines.push(`• Drop-off (Destination): ${payload.destination.label.trim()}`);

  if (payload.distanceKm != null && Number.isFinite(payload.distanceKm) && payload.distanceKm > 0) {
    lines.push(`• Driving Distance: ${formatDistanceLabel(payload.distanceKm)}`);
  }
  if (
    payload.durationMins != null &&
    Number.isFinite(payload.durationMins) &&
    payload.durationMins > 0
  ) {
    lines.push(`• Est. Travel Time: ${formatDurationLabel(payload.durationMins)}`);
  }
  if (payload.scheduleText?.trim()) {
    lines.push(`• Schedule: ${payload.scheduleText.trim()}`);
  }
  if (payload.passengers && String(payload.passengers).trim()) {
    lines.push(`• Passengers: ${String(payload.passengers).trim()}`);
  }
  if (payload.fareEstimate?.trim()) {
    lines.push(`• Fare Quote: ${payload.fareEstimate.trim()}`);
  }
  if (payload.notes?.trim()) {
    lines.push(`• Notes: ${payload.notes.trim()}`);
  }

  lines.push(
    "",
    "*VIEW TRIP ON GOOGLE MAPS*",
    `• Full Route (Origin → Destination):\n${routeMapUrl}`,
    `• Pickup Location Pin:\n${pickupPinUrl}`,
    `• Destination Location Pin:\n${destinationPinUrl}`,
    "",
    `Sent by ${payload.driverName.trim() || "your driver"} via Travel.`,
  );

  return lines.join("\n");
}

/**
 * Direct WhatsApp share link with NO recipient phone number pre-filled,
 * so WhatsApp opens the native contact picker allowing the driver to choose
 * any customer contact and send immediately.
 */
export function buildWhatsAppDirectContactPickerUrl(message: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

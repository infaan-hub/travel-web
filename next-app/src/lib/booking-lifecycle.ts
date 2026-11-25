export const ZANZIBAR_UTC_OFFSET_HOURS = 3;
export const RESCHEDULE_CUTOFF_HOURS = 5;
export const RESCHEDULE_CUTOFF_MS = RESCHEDULE_CUTOFF_HOURS * 60 * 60 * 1000;

export type BookingTimingInput = {
  status?: string | null;
  travelDate?: Date | string | null;
  travel_date?: string | null;
  pickupTime?: string | null;
  pickup_time?: string | null;
};

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const PICKUP_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

/**
 * Extracts a canonical YYYY-MM-DD date string from a Date or ISO date/datetime string.
 */
export function extractIsoDatePart(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const trimmed = String(value).trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Extracts a canonical HH:MM time string from a pickup time value.
 */
export function normalizePickupTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  const match = trimmed.match(PICKUP_TIME_RE);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

/**
 * Resolves a booking's scheduled pickup instant in Zanzibar time (East Africa Time, UTC+3).
 * If a legacy booking has no pickupTime stored, falls back to 23:59:59 on travelDate (UTC+3).
 */
export function resolveBookingScheduledAt(
  travelDate: Date | string | null | undefined,
  pickupTime?: string | null,
): Date | null {
  const datePart = extractIsoDatePart(travelDate);
  if (!datePart) return null;
  const dateMatch = datePart.match(ISO_DATE_RE);
  if (!dateMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  let hour = 23;
  let minute = 59;
  let second = 59;

  if (pickupTime && pickupTime.trim() !== "") {
    const timeMatch = pickupTime.trim().match(PICKUP_TIME_RE);
    if (!timeMatch) return null;
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2]);
    second = timeMatch[3] ? Number(timeMatch[3]) : 0;
  }

  const utcMs =
    Date.UTC(year, month - 1, day, hour - ZANZIBAR_UTC_OFFSET_HOURS, minute, second);
  const resolved = new Date(utcMs);
  return Number.isNaN(resolved.getTime()) ? null : resolved;
}

/**
 * Returns today's YYYY-MM-DD date string in Zanzibar time (UTC+3).
 */
export function todayIsoInZanzibar(now: Date = new Date()): string {
  const eatMs = now.getTime() + ZANZIBAR_UTC_OFFSET_HOURS * 60 * 60 * 1000;
  return new Date(eatMs).toISOString().slice(0, 10);
}

const EXPIRABLE_UNCONFIRMED_STATUSES = new Set(["pending", "requested", "quoted"]);
const RESCHEDULABLE_STATUSES = new Set(["pending", "confirmed"]);

/**
 * Returns true when an unconfirmed booking (or trip request) has passed its
 * scheduled booking date & time without being confirmed, or is already marked expired.
 */
export function isBookingExpired(
  booking: BookingTimingInput,
  now: Date = new Date(),
): boolean {
  const status = (booking.status ?? "").toLowerCase();
  if (status === "expired") return true;
  if (!EXPIRABLE_UNCONFIRMED_STATUSES.has(status)) return false;

  const scheduledAt = resolveBookingScheduledAt(
    booking.travelDate ?? booking.travel_date,
    booking.pickupTime ?? booking.pickup_time,
  );
  if (!scheduledAt) return false;
  return now.getTime() >= scheduledAt.getTime();
}

/**
 * Resolves the effective booking status, automatically returning "expired" when
 * an unconfirmed booking has passed its scheduled booking date & time.
 */
export function resolveEffectiveBookingStatus(
  booking: BookingTimingInput,
  now: Date = new Date(),
): string {
  if (isBookingExpired(booking, now)) return "expired";
  return (booking.status ?? "pending").toLowerCase();
}

/**
 * Returns the reschedule deadline (5 hours before scheduled pickup time).
 */
export function getRescheduleDeadline(booking: BookingTimingInput): Date | null {
  const scheduledAt = resolveBookingScheduledAt(
    booking.travelDate ?? booking.travel_date,
    booking.pickupTime ?? booking.pickup_time,
  );
  if (!scheduledAt) return null;
  return new Date(scheduledAt.getTime() - RESCHEDULE_CUTOFF_MS);
}

/**
 * Customers may reschedule pending or confirmed bookings ONLY when at least
 * 5 hours remain before the scheduled pickup date & time.
 * Below 5 hours (or when expired/cancelled/in_progress/completed), rescheduling is disabled.
 */
export function canRescheduleBooking(
  booking: BookingTimingInput,
  now: Date = new Date(),
): boolean {
  const effectiveStatus = resolveEffectiveBookingStatus(booking, now);
  if (!RESCHEDULABLE_STATUSES.has(effectiveStatus)) return false;

  const scheduledAt = resolveBookingScheduledAt(
    booking.travelDate ?? booking.travel_date,
    booking.pickupTime ?? booking.pickup_time,
  );
  if (!scheduledAt) return false;

  return scheduledAt.getTime() - now.getTime() >= RESCHEDULE_CUTOFF_MS;
}

/**
 * Validates the target date & time when rescheduling a booking.
 */
export function validateRescheduleTarget(
  newTravelDate: string,
  newPickupTime: string,
  now: Date = new Date(),
):
  | { ok: true; travelDate: Date; pickupTime: string; scheduledAt: Date }
  | { ok: false; reason: string } {
  const datePart = extractIsoDatePart(newTravelDate);
  if (!datePart || !ISO_DATE_RE.test(datePart)) {
    return { ok: false, reason: "Enter a valid booking date (YYYY-MM-DD)." };
  }

  const normalizedTime = normalizePickupTime(newPickupTime);
  if (!normalizedTime) {
    return { ok: false, reason: "Enter a valid pickup time (HH:MM)." };
  }

  const travelDate = new Date(`${datePart}T00:00:00.000Z`);
  if (Number.isNaN(travelDate.getTime()) || travelDate.toISOString().slice(0, 10) !== datePart) {
    return { ok: false, reason: "Enter a valid calendar date." };
  }

  const scheduledAt = resolveBookingScheduledAt(datePart, normalizedTime);
  if (!scheduledAt) {
    return { ok: false, reason: "Enter a valid booking date and pickup time." };
  }

  if (scheduledAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "New booking date and time must be in the future." };
  }

  return { ok: true, travelDate, pickupTime: normalizedTime, scheduledAt };
}

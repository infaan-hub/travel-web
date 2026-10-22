import type {
  BookingStatus,
  TourPublicationStatus,
} from "@prisma/client";

/**
 * Company-side booking transitions. These are deliberately one-way:
 * pending can be confirmed or cancelled, confirmed can only be cancelled,
 * and a cancelled booking is terminal.
 */
export const COMPANY_BOOKING_TRANSITIONS: Readonly<
  Record<BookingStatus, readonly BookingStatus[]>
> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  cancelled: [],
};

export function companyBookingTransitions(
  status: BookingStatus,
): readonly BookingStatus[] {
  return COMPANY_BOOKING_TRANSITIONS[status];
}

export function isCompanyBookingTransitionAllowed(
  current: BookingStatus,
  next: BookingStatus,
): boolean {
  if (current === next) return true;
  return COMPANY_BOOKING_TRANSITIONS[current].includes(next);
}

/**
 * Company members may move a tour between these publication states directly.
 * PENDING_REVIEW and REJECTED are moderation outcomes controlled by the
 * platform, not company-side operations.
 */
export const COMPANY_EDITABLE_TOUR_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const satisfies readonly TourPublicationStatus[];

export type CompanyEditableTourStatus =
  (typeof COMPANY_EDITABLE_TOUR_STATUSES)[number];

export function isCompanyEditableTourStatus(
  value: unknown,
): value is CompanyEditableTourStatus {
  return (
    typeof value === "string" &&
    (COMPANY_EDITABLE_TOUR_STATUSES as readonly string[]).includes(value)
  );
}

/** Platform-owned company fields that the company workspace must never edit. */
export const COMPANY_PLATFORM_MANAGED_FIELDS = [
  "name",
  "slug",
  "registration_reference",
  "business_type",
  "status",
  "is_public",
] as const;

export const BOOKING_STATUS_LABELS: Readonly<Record<BookingStatus, string>> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

export const TOUR_PUBLICATION_LABELS: Readonly<
  Record<TourPublicationStatus, string>
> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

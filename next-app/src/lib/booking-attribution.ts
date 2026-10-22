/**
 * Historical booking attribution is derived only from a tour loaded by the
 * server. Callers must never pass a client-supplied company id.
 */
export type BookingAttributionTour = {
  title: string;
  companyId: number | null;
  company?: { name: string } | null;
};

export type BookingAttribution = {
  companyId: number | null;
  companyNameSnapshot: string | null;
  tourTitleSnapshot: string;
};

export function deriveBookingAttribution(
  tour: BookingAttributionTour,
): BookingAttribution {
  return {
    companyId: tour.companyId,
    companyNameSnapshot: tour.company?.name ?? null,
    tourTitleSnapshot: tour.title,
  };
}

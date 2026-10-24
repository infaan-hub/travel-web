export function calculateCompanyAnalyticsMetrics({
  bookings,
  pendingBookings,
  confirmedBookings,
  cancelledBookings,
  travelers,
  bookedValueTzs,
  pricedActiveBookings,
}: {
  bookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  travelers: number;
  bookedValueTzs: number;
  pricedActiveBookings: number;
}) {
  const activeBookings = pendingBookings + confirmedBookings;

  return {
    active_bookings: activeBookings,
    confirmation_rate_pct:
      activeBookings > 0
        ? Math.round((confirmedBookings / activeBookings) * 1000) / 10
        : null,
    cancellation_rate_pct:
      bookings > 0
        ? Math.round((cancelledBookings / bookings) * 1000) / 10
        : null,
    average_travelers_per_booking:
      activeBookings > 0
        ? Math.round((travelers / activeBookings) * 100) / 100
        : null,
    average_booked_value_tzs:
      pricedActiveBookings > 0
        ? Math.round(bookedValueTzs / pricedActiveBookings)
        : null,
  };
}

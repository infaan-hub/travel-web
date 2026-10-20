import "server-only";
import { env } from "@/lib/env";
import { createInAppNotification, sendPushToStaff, sendPushToUsers } from "@/lib/push";
import type { BookingStatus } from "@prisma/client";

export type BookingNotificationInput = {
  id: number;
  reference: string | null;
  fullName: string;
  email: string;
  tourTitle: string;
  travelDate: Date;
  travelers: number;
  userId: number | null;
};

export function buildWhatsAppUrl(data: {
  full_name: string;
  email: string;
  phone: string;
  tour?: string;
  destination?: string;
  travelers?: number | string;
  travel_date?: string;
  notes?: string;
}): string {
  const config = env();
  const lines = [
    `Hello ${data.full_name},`,
    "",
    `Tour: ${data.tour ?? "Custom Tour Inquiry"}`,
    data.destination ? `Destination: ${data.destination}` : null,
    data.travelers ? `Travelers: ${data.travelers}` : null,
    data.travel_date ? `Travel date: ${data.travel_date}` : null,
    data.notes ? `Notes: ${data.notes}` : null,
    "",
    "Sent from Infaan tours and travel.",
  ].filter(Boolean);

  return `https://wa.me/${config.WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(
    lines.join("\n"),
  )}`;
}

/** Notifies staff and the customer that a booking request was created. */
export async function notifyBookingCreated(booking: BookingNotificationInput): Promise<void> {
  const reference = booking.reference ?? `#${booking.id}`;
  const summary = `${booking.tourTitle} on ${booking.travelDate.toISOString().slice(0, 10)} for ${booking.travelers} traveler(s)`;

  await sendPushToStaff({
    title: "New booking request",
    body: `${booking.fullName} — ${summary}`,
    url: `/admin/bookings/`,
    tag: `booking-${booking.id}`,
  });
  await createInAppNotification(null, {
    title: "New booking request",
    body: `${booking.fullName} — ${summary}`,
    url: "/admin/bookings/",
    tag: `booking-${booking.id}`,
  });

  if (booking.userId) {
    await createInAppNotification(booking.userId, {
      title: "Booking received",
      body: `Your booking ${reference} for ${booking.tourTitle} is being reviewed.`,
      url: "/bookings/",
      tag: `booking-${booking.id}`,
    });
    await sendPushToUsers([booking.userId], {
      title: "Booking received",
      body: `Reference ${reference}. We will confirm shortly.`,
      url: "/bookings/",
      tag: `booking-${booking.id}`,
    });
  }
}

/** Notifies the customer (and staff) about a booking status change. */
export async function notifyBookingStatusChanged(
  booking: BookingNotificationInput,
  status: BookingStatus,
): Promise<void> {
  const reference = booking.reference ?? `#${booking.id}`;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const body = `Your booking ${reference} for ${booking.tourTitle} is now ${label.toLowerCase()}.`;

  if (booking.userId) {
    await createInAppNotification(booking.userId, {
      title: `Booking ${label.toLowerCase()}`,
      body,
      url: "/bookings/",
      tag: `booking-${booking.id}`,
    });
    await sendPushToUsers([booking.userId], {
      title: `Booking ${label.toLowerCase()}`,
      body,
      url: "/bookings/",
      tag: `booking-${booking.id}`,
    });
  }

  await sendPushToStaff({
    title: `Booking ${label.toLowerCase()}`,
    body: `${booking.fullName} — ${body}`,
    url: "/admin/bookings/",
    tag: `booking-${booking.id}`,
  });
}

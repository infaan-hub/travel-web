import type { BookingStatusValue, DriverTripStage } from "@/lib/driver-workflow";

export type CustomerAccountInfo = {
  id: number | null;
  username: string | null;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  email_verified: boolean;
  phone: string;
  address: string;
  avatar_url: string | null;
  date_joined: string | null;
};

export type DriverVehicleInfo = {
  id?: number;
  name: string;
  plate_number: string;
  category: string;
  capacity?: number;
  luggage_capacity?: number;
};

export type DriverBookingRecord = {
  id: number;
  reference: string | null;
  user_id?: number | null;
  company_id?: number | null;
  full_name: string;
  phone: string;
  email: string;
  passengers: number;
  travel_date: string;
  end_date: string | null;
  pickup_time: string | null;
  total_price: string | null;
  status: BookingStatusValue;
  driver_stage?: DriverTripStage | string | null;
  confirmed_at?: string | null;
  started_at?: string | null;
  arrived_at?: string | null;
  picked_up_at?: string | null;
  reached_dest_at?: string | null;
  completed_at?: string | null;
  driver_lat?: number | null;
  driver_lng?: number | null;
  driver_location_updated_at?: string | null;
  driver_notes?: string;
  is_public: boolean;
  is_public_offer?: boolean;
  notes: string;
  origin: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  destination: string | null;
  dest_lat: number | null;
  dest_lng: number | null;
  distance_km: number | null;
  duration_mins: number | null;
  customer_account?: CustomerAccountInfo | null;
  service: {
    id?: number;
    title: string;
    description?: string;
    pricing_type?: string;
    vehicle: DriverVehicleInfo | null;
  } | null;
  vehicle: DriverVehicleInfo | null;
  driver?: { id: number; name: string; phone?: string; email?: string } | null;
  company: {
    id?: number;
    name: string;
    slug?: string;
    contact_phone?: string;
    contact_email?: string;
    logo_image_url?: string | null;
  } | null;
};

export type DriverTripRequestRecord = {
  id: number;
  origin: string;
  destination: string;
  origin_lat?: number | null;
  origin_lng?: number | null;
  dest_lat?: number | null;
  dest_lng?: number | null;
  travel_date?: string;
  travelDate?: string;
  pickup_time?: string | null;
  passengers: number;
  luggage: number;
  notes: string;
  status: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export function formatShortDate(value: string | null | undefined, withYear = true): string {
  if (!value) return "Date TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

export function formatClockTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatPhoneHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  return cleaned.length >= 6 ? `tel:${cleaned}` : null;
}

export function formatWhatsAppHref(raw: string | null | undefined, message?: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return null;
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${query}`;
}

export function personInitials(name: string | null | undefined): string {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "CU";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

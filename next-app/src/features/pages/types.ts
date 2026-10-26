/**
 * Shared types for the page components. The API returns JSON payloads, so the
 * response types describe the fields the UI relies on and allow additional
 * fields coming from the server.
 */
import type { CompanyOpeningHours } from "@/lib/company-opening-hours";
import type { CompanyRole, CompanyStatus } from "@prisma/client";
export type { CompanyRole, CompanyStatus } from "@prisma/client";

export type ImageUrl = string | null;

export type Tour = {
  id: number;
  title: string;
  description: string;
  short_description: string;
  price: string | number;
  duration: string;
  destination: string;
  category: "zanzibar" | "tanzania" | "international";
  destination_lat?: number | null;
  destination_lng?: number | null;
  available: boolean;
  featured: boolean;
  image_url?: ImageUrl;
  main_image_url?: ImageUrl;
  image2_url?: ImageUrl;
  image3_url?: ImageUrl;
  gallery_image_urls?: string[];
  average_rating?: number | null;
  review_count?: number;
  included_items?: string[];
  excluded_items?: string[];
  max_travelers?: number;
  company_id?: number | null;
  company_name?: string | null;
  company_slug?: string | null;
  company_public_path?: string | null;
  [key: string]: any;
};

export type TravelTip = {
  id: number;
  title: string;
  content: string;
  category: string;
  image_url?: ImageUrl;
  published: boolean;
  created_at?: string;
  [key: string]: any;
};

export type GalleryImage = {
  id: number;
  tour_id?: number;
  image_url: string;
  order?: number;
  [key: string]: any;
};

export type Booking = {
  id: number;
  reference?: string | null;
  company?: number | null;
  company_name?: string | null;
  tour_title: string;
  tour_image?: ImageUrl;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
  travelers: number;
  travel_date: string;
  notes?: string;
  status: "pending" | "confirmed" | "cancelled";
  total_price?: number | null;
  tour_price?: string | null;
  created_at?: string;
  [key: string]: any;
};

export type Customer = {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  account_type?: "CUSTOMER" | "TOUR_COMPANY";
  is_active?: boolean;
  companies?: {
    id: number;
    name: string;
    slug: string;
    role: string;
    status: "ACTIVE" | "INVITED" | "REVOKED";
  }[];
  email_verified?: boolean;
  profile_image_url?: ImageUrl;
  date_joined?: string;
  [key: string]: any;
};

export type Review = {
  id: number;
  rating: number;
  content: string;
  status: "pending" | "approved" | "deleted";
  user?: Customer | null;
  user_name?: string;
  tour_id?: number | null;
  tour_title?: string;
  created_at?: string;
  [key: string]: any;
};

export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at?: string;
  [key: string]: any;
};

export type TravelDriver = {
  id: number;
  name: string;
  phone: string;
  image?: ImageUrl;
  [key: string]: any;
};

export type TravelVehicle = {
  id: number;
  car_name: string;
  plate_number: string;
  [key: string]: any;
};

export type Hotel = {
  id: number;
  name: string;
  location: string;
  phone?: string;
  image_url?: ImageUrl;
  rooms?: Room[];
  [key: string]: any;
};

export type Room = {
  id: number;
  hotel_id?: number;
  name: string;
  price: string | number;
  description?: string;
  [key: string]: any;
};

export type Workspace = {
  id: number;
  tourist: number | null;
  tourist_name: string;
  tourist_email: string;
  selected_tours: number[];
  selected_tours_details?: Tour[];
  selected_hotel: number | null;
  hotel_name?: string | null;
  selected_rooms: number[];
  selected_rooms_details?: Room[];
  selected_travel_driver: number | null;
  driver_name?: string | null;
  selected_travel_vehicle: number | null;
  vehicle_name?: string | null;
  total_price: string | null;
  notes: string;
  status: "draft" | "approved" | "completed";
  message_sent?: boolean;
  created_at?: string;
  updated_at?: string;
  tasks?: WorkspaceTask[];
  [key: string]: any;
};

export type WorkspaceTask = {
  id: number;
  workspace_id?: number;
  day: number;
  title: string;
  description?: string;
  completed: boolean;
  [key: string]: any;
};

export type HomeSettings = {
  id?: number;
  hero_image_url?: ImageUrl;
  hero_secondary_image_url?: ImageUrl;
  hero_feature_image_url?: ImageUrl;
  hero_thumb_image_url?: ImageUrl;
  zanzibar_image_url?: ImageUrl;
  more_experiences_image_url?: ImageUrl;
  more_experiences_image_urls?: (ImageUrl | null)[];
  tanzibar_image_url?: ImageUrl;
  hero_image?: ImageUrl;
  zanzibar_image?: ImageUrl;
  tanzibar_image?: ImageUrl;
  [key: string]: any;
};

export type CompanyBusinessType =
  | "TOUR_OPERATOR"
  | "SAFARI_OPERATOR"
  | "EXCURSION_PROVIDER"
  | "OTHER";

export type CompanyMembership = {
  id: number;
  company: number;
  user: {
    id: number;
    username: string;
    email: string;
    full_name: string;
    profile_image_url?: ImageUrl;
  };
  role: CompanyRole;
  status: "INVITED" | "ACTIVE" | "REVOKED";
  assigned_by?: { id: number; username: string } | null;
  created_at?: string;
  updated_at?: string;
  revoked_at?: string | null;
};

export type Company = {
  id: number;
  name: string;
  slug: string;
  description: string;
  registration_reference?: string | null;
  business_type: CompanyBusinessType;
  logo_image_key?: string | null;
  logo_image_url?: ImageUrl;
  cover_image_key?: string | null;
  cover_image_url?: ImageUrl;
  contact_email: string;
  contact_phone: string;
  alternative_phone?: string | null;
  whatsapp_number?: string | null;
  address: string;
  locality?: string | null;
  district?: string | null;
  region?: string | null;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  website?: string | null;
  social_links?: Record<string, string> | null;
  opening_hours?: CompanyOpeningHours | string | null;
  status: CompanyStatus;
  is_public: boolean;
  public_path: string;
  created_by?: { id: number; username: string } | null;
  members_count: number;
  tours_count: number;
  bookings_count: number;
  created_at?: string;
  updated_at?: string;
  suspended_at?: string | null;
  archived_at?: string | null;
  members?: CompanyMembership[];
  tours?: CompanyTourSummary[];
  bookings?: CompanyBookingSummary[];
  stats?: CompanyStats;
  recent_audit?: CompanyAuditEntry[];
  [key: string]: any;
};

export type CompanyStats = {
  members_active: number;
  tours_total: number;
  tours_published: number;
  bookings_total: number;
  bookings_pending: number;
  bookings_confirmed: number;
  bookings_cancelled: number;
  travelers_total: number;
};

export type CompanyTourSummary = {
  id: number;
  title: string;
  price: string | null;
  duration: string;
  destination: string;
  publication_status: string;
  available: boolean;
  bookings_count: number;
  updated_at?: string;
};

export type CompanyBookingSummary = {
  id: number;
  reference: string | null;
  full_name: string;
  travelers: number;
  travel_date: string | null;
  status: "pending" | "confirmed" | "cancelled";
  tour_title: string | null;
  created_at?: string;
};

export type CompanyAuditEntry = {
  id: number;
  action: string;
  entity: string;
  entity_id: string | null;
  actor?: { id: number; username: string } | null;
  before?: unknown;
  after?: unknown;
  created_at?: string;
};

export type DashboardStats = {
  total_tours: number;
  total_bookings: number;
  total_reviews: number;
  total_users: number;
  total_tips: number;
  new_users_today: number;
  new_users_week: number;
  new_users_month: number;
  pending_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  zanzibar_tours: number;
  tanzania_tours: number;
  total_visitors: number;
  unique_visitors: number;
  logged_in_visitors: number;
  guest_visitors: number;
  visitors_today: number;
  visitors_week: number;
  visitors_month: number;
  total_workspaces: number;
  [key: string]: any;
};

export type Analytics = {
  page_views?: { page: string; visits: number }[];
  tours_by_category?: { name: string; tours: number }[];
  booking_status?: { name: string; value: number }[];
  [key: string]: any;
};

export type CustomerDashboard = {
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  total_reviews: number;
  recent_bookings?: Booking[];
  [key: string]: any;
};

export type TourTranslation = {
  locale: string;
  title: string;
  description: string;
  short_description: string;
};

export type PricingDraft = {
  tourist?: Customer | null;
  selectedTours?: Tour[];
  selectedHotel?: Hotel | null;
  selectedRooms?: Room[];
  selectedTravelDriver?: TravelDriver | null;
  selectedTravelVehicle?: TravelVehicle | null;
  totalPrice?: number;
  notes?: string;
  [key: string]: any;
};

export type TemplateSummary = {
  id: number;
  notes: string;
  total_price: string | null;
  tourist_name: string;
  created_at: string;
  tours: { id: number; title: string }[];
};

export type VerificationCode = {
  user_id?: number;
  username?: string;
  email?: string;
  code: string;
  expires_at?: string;
  message?: string;
};

/** Shape of an axios failure used by the pages. */
export type ApiFailure = {
  response?: {
    status?: number;
    data?: {
      message?: string;
      detail?: string;
      errors?: Record<string, string[]>;
    };
  };
  message?: string;
};

/** Type guard for uploaded files (safe in environments without File). */
export function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

/** Reads a readable message from any thrown value. */export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  const failure = error as ApiFailure | undefined;
  return (
    failure?.response?.data?.message ??
    failure?.response?.data?.detail ??
    failure?.message ??
    fallback
  );
}

/** Field level validation errors returned by the API. */
export function fieldErrors(error: unknown): Record<string, string[]> {
  const failure = error as ApiFailure | undefined;
  return failure?.response?.data?.errors ?? {};
}

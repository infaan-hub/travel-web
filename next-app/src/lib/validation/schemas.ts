import { z } from "zod";

export const idSchema = z.coerce.number().int().positive();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export function parseItemsList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item));
  } catch {
    // Fall back to comma-separated input.
  }
  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const itemsListSchema = z.preprocess(parseItemsList, z.array(z.string()));

export const booleanishSchema = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    return ["true", "1", "on", "yes"].includes(value.toLowerCase());
  });

const optionalTrimmed = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? "");

const optionalNullableFloat = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

const optionalNullableInt = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  });

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(150)
    .regex(/^[\w.@+-]+$/, "Username contains invalid characters."),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  first_name: z.string().trim().max(150).optional(),
  last_name: z.string().trim().max(150).optional(),
});

export const adminRegisterSchema = registerSchema.extend({
  setup_token: z.string().optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

export const userUpdateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(150)
    .regex(/^[\w.@+-]+$/, "Username contains invalid characters.")
    .optional(),
  email: z.string().trim().email("Enter a valid email address.").max(254).optional(),
  first_name: z.string().trim().max(150).optional(),
  last_name: z.string().trim().max(150).optional(),
  password: z.string().min(8).max(128).optional(),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(2000).optional(),
  email: z.string().trim().email("Enter a valid email address.").optional(),
});

export const tourSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z.string().trim().min(1, "Description is required."),
  short_description: z.string().trim().max(300).optional(),
  price: z.coerce.number().nonnegative("Price must be positive."),
  duration: z.string().trim().min(1, "Duration is required.").max(100),
  destination: z.string().trim().min(1, "Destination is required.").max(200),
  destination_lat: optionalNullableFloat,
  destination_lng: optionalNullableFloat,
  category: z.enum(["zanzibar", "tanzania", "international"]),
  includes: itemsListSchema.optional(),
  excludes: itemsListSchema.optional(),
  available: booleanishSchema.optional(),
  featured: booleanishSchema.optional(),
});

export const tourUpdateSchema = tourSchema.partial();

const attractionBaseSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  description: z.string().trim().optional(),
  location: z.string().trim().min(1, "Location is required.").max(200),
  region: z.string().trim().max(100).optional(),
  category: z.string().trim().max(20).optional(),
  best_time_to_visit: z.string().trim().max(200).optional(),
  entry_fee: z.string().trim().max(200).optional(),
  activities: z.string().trim().optional(),
});

export const attractionSchema = attractionBaseSchema.extend({
  description: z.string().trim().optional().default(""),
  region: z.string().trim().max(100).optional().default(""),
  category: z.string().trim().max(20).optional().default(""),
  best_time_to_visit: z.string().trim().max(200).optional().default(""),
  entry_fee: z.string().trim().max(200).optional().default(""),
  activities: z.string().trim().optional().default(""),
});

export const attractionUpdateSchema = attractionBaseSchema.partial();

export const reviewCreateSchema = z
  .object({
    rating: z.coerce.number().int().min(1, "Rating must be between 1 and 5.").max(5),
    content: z.string().trim().min(1, "Review content is required.").max(5000),
    tour: optionalNullableInt,
  })
  .refine((data) => data.tour === undefined || data.tour === null || data.tour > 0, {
    message: "Invalid tour.",
    path: ["tour"],
  });

export const reviewModerateSchema = z
  .object({
    status: z.enum(["pending", "approved", "deleted"]).optional(),
    approved: z.boolean().optional(),
  })
  .refine((data) => data.status !== undefined || data.approved !== undefined, {
    message: "A review status is required.",
  });

export const reviewUserUpdateSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  content: z.string().trim().min(1).max(5000).optional(),
});

const bookingBaseSchema = z.object({
  tour: idSchema,
  full_name: z.string().trim().min(1, "Full name is required.").max(200),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  phone: z.string().trim().min(1, "Phone number is required.").max(20),
  address: z.string().trim().max(2000).optional(),
  travelers: z.coerce.number().int().min(1, "At least one traveler is required.").max(50),
  travel_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid travel date."),
  notes: z.string().trim().max(2000).optional(),
  user_lat: optionalNullableFloat,
  user_lng: optionalNullableFloat,
  distance_km: optionalNullableFloat,
  estimated_time_mins: optionalNullableInt,
  google_maps_url: z.string().trim().max(2000).optional(),
  session_id: z.string().trim().max(100).optional(),
});

export const bookingCreateSchema = bookingBaseSchema.extend({
  address: z.string().trim().max(2000).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  google_maps_url: z.string().trim().max(2000).optional().default(""),
});

export const bookingUpdateSchema = bookingBaseSchema
  .omit({ tour: true })
  .partial()
  .extend({ status: z.enum(["pending", "confirmed", "cancelled"]).optional() });

export const bookingStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled"]),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  phone: z.string().trim().max(20).optional().default(""),
  subject: z.string().trim().min(1, "Subject is required.").max(300),
  message: z.string().trim().min(1, "Message is required.").max(5000),
});

const tipBaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  content: z.string().trim().min(1, "Content is required.").max(20000),
  category: z.string().trim().max(100).optional(),
  published: booleanishSchema.optional(),
});

export const tipSchema = tipBaseSchema.extend({
  category: z.string().trim().max(100).optional().default(""),
});

export const tipUpdateSchema = tipBaseSchema.partial();

export const driverSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  phone: z.string().trim().min(1, "Phone is required.").max(20),
});

export const vehicleSchema = z.object({
  car_name: z.string().trim().min(1, "Car name is required.").max(200),
  plate_number: z.string().trim().min(1, "Plate number is required.").max(50),
});

const hotelBaseSchema = z.object({
  name: z.string().trim().min(1, "Hotel name is required.").max(200),
  location: z.string().trim().min(1, "Location is required.").max(300),
  phone: z.string().trim().max(20).optional(),
});

export const hotelSchema = hotelBaseSchema.extend({
  phone: z.string().trim().max(20).optional().default(""),
});

export const hotelUpdateSchema = hotelBaseSchema.partial();

export const roomSchema = z.object({
  hotel: idSchema,
  name: z.string().trim().min(1, "Room name is required.").max(200),
  price: z.coerce.number().nonnegative("Price must be positive."),
  description: z.string().trim().max(2000).optional().default(""),
});

export const roomUpdateSchema = z.object({
  hotel: idSchema.optional(),
  name: z.string().trim().min(1).max(200).optional(),
  price: z.coerce.number().nonnegative().optional(),
  description: z.string().trim().max(2000).optional(),
});

// Defaults intentionally live on the create schema only: `.partial()` keeps
// inner defaults in Zod, which would otherwise clear relations on every PATCH.
const workspaceBaseSchema = z.object({
  tourist: optionalNullableInt,
  tourist_id: optionalNullableInt,
  tourist_name: z.string().trim().max(200).optional(),
  tourist_email: z.string().trim().max(254).optional(),
  selected_tours: z.array(idSchema).optional(),
  selected_hotel: optionalNullableInt,
  selected_rooms: z.array(z.union([idSchema, z.object({ id: idSchema })])).optional(),
  selected_travel_driver: optionalNullableInt,
  selected_travel_vehicle: optionalNullableInt,
  total_price: optionalNullableFloat,
  notes: z.string().max(5000).optional(),
  status: z.enum(["draft", "approved", "completed"]).optional(),
});

export const workspaceCreateSchema = workspaceBaseSchema.extend({
  tourist_name: z.string().trim().max(200).optional().default(""),
  tourist_email: z.string().trim().max(254).optional().default(""),
  selected_tours: z.array(idSchema).optional().default([]),
  selected_rooms: z
    .array(z.union([idSchema, z.object({ id: idSchema })]))
    .optional()
    .default([]),
  notes: z.string().max(5000).optional().default(""),
});

export const workspaceUpdateSchema = workspaceBaseSchema.partial();

export const workspacePricingSchema = z.object({
  total_price: z.coerce.number().nonnegative().optional(),
  message_sent: booleanishSchema.optional(),
  status: z.enum(["draft", "approved", "completed"]).optional(),
});

const workspaceTaskBaseSchema = z.object({
  day: z.coerce.number().int().min(1).max(365),
  title: z.string().trim().min(1, "Title is required.").max(300),
  description: z.string().max(2000).optional(),
  completed: booleanishSchema.optional(),
});

export const workspaceTaskSchema = workspaceTaskBaseSchema.extend({
  description: z.string().max(2000).optional().default(""),
});

export const workspaceTaskUpdateSchema = workspaceTaskBaseSchema.partial();

export const trackVisitSchema = z.object({
  session_id: z.string().trim().max(100).optional(),
  page_url: z.string().trim().max(500).optional().default(""),
  page: z.string().trim().max(500).optional(),
  tour_id: optionalNullableInt,
});

export const routeCalculateSchema = z.object({
  origin_lat: z.coerce.number().min(-90).max(90),
  origin_lng: z.coerce.number().min(-180).max(180),
  destination_lat: z.coerce.number().min(-90).max(90),
  destination_lng: z.coerce.number().min(-180).max(180),
});

export const sendEmailSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required.").max(200),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  phone: z.string().trim().max(20).optional().default(""),
  tour: z.string().trim().min(1, "Tour is required.").max(300),
  destination: z.string().trim().max(300).optional().default(""),
  travelers: z.coerce.number().int().min(1).max(50).optional(),
  children: z.coerce.number().int().min(0).max(50).optional(),
  travel_date: z.string().trim().max(40).optional().default(""),
  notes: z.string().max(5000).optional().default(""),
  address: z.string().max(2000).optional().default(""),
});

export const sendWhatsappSchema = z.object({
  full_name: z.string().trim().max(200).optional().default(""),
  email: z.string().trim().max(254).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  tour: z.string().trim().max(300).optional().default(""),
  travelers: z.union([z.string(), z.number()]).optional(),
  travel_date: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().max(2000).optional().default(""),
  notes: z.string().max(5000).optional().default(""),
});

export const geocodeQuerySchema = z.object({
  location: z.string().trim().min(2, "Location is required.").max(200),
});

export const reverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TourInput = z.infer<typeof tourSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type WorkspaceCreateInput = z.infer<typeof workspaceCreateSchema>;

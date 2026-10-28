import { z } from "zod";
import {
  COMPANY_BUSINESS_TYPES,
  COMPANY_LIFECYCLE_ACTIONS,
  COMPANY_ROLES,
  COMPANY_STATUSES,
  coordinatePairIssue,
} from "@/lib/company-domain";
import { COMPANY_EDITABLE_TOUR_STATUSES } from "@/lib/company-operations";
import type { CompanyOpeningHours } from "@/lib/company-opening-hours";
import { booleanishSchema, tourSchema } from "@/lib/validation/schemas";

const emptyToNull = (value: unknown): unknown => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value;
};

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().max(max).nullable().optional());

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .url("Enter a valid URL.")
  .refine((value) => /^https?:\/\//i.test(value), "Use an http:// or https:// URL.");

const optionalUrl = z.preprocess(
  emptyToNull,
  httpUrl.nullable().optional(),
);

const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().trim().max(254).email("Enter a valid email address.").nullable().optional(),
);

function nullableCoordinate(min: number, max: number) {
  return z.preprocess((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  }, z.number().min(min).max(max).nullable().optional());
}

const socialLinksSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}, z
  .object({
    facebook: httpUrl.optional(),
    instagram: httpUrl.optional(),
    x: httpUrl.optional(),
    linkedin: httpUrl.optional(),
    youtube: httpUrl.optional(),
    tripadvisor: httpUrl.optional(),
  })
  .strict()
  .nullable()
  .optional());

const openingDaySchema = z
  .object({
    is_open: z.boolean(),
    opens_at: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
    closes_at: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
  })
  .strict()
  .superRefine((day, context) => {
    if (!day.is_open) return;
    if (!day.opens_at || !day.closes_at) {
      context.addIssue({
        code: "custom",
        message: "Set both opening and closing times for an open day.",
      });
      return;
    }
    if (day.closes_at <= day.opens_at) {
      context.addIssue({
        code: "custom",
        path: ["closes_at"],
        message: "Closing time must be later than opening time.",
      });
    }
  });

export const companyOpeningHoursSchema = z.object({
  monday: openingDaySchema,
  tuesday: openingDaySchema,
  wednesday: openingDaySchema,
  thursday: openingDaySchema,
  friday: openingDaySchema,
  saturday: openingDaySchema,
  sunday: openingDaySchema,
}).strict();

const openingHoursSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.union([companyOpeningHoursSchema, z.string().max(500)]).nullable().optional());

const companyBaseSchema = z.object({
  name: optionalText(200),
  slug: z.preprocess(emptyToNull, z.string().max(120).nullable().optional()),
  description: optionalText(5000),
  registration_reference: optionalText(120),
  business_type: z.enum(COMPANY_BUSINESS_TYPES).optional(),
  contact_email: optionalEmail,
  contact_phone: optionalText(30),
  alternative_phone: optionalText(30),
  whatsapp_number: optionalText(30),
  address: optionalText(500),
  locality: optionalText(120),
  district: optionalText(120),
  region: optionalText(120),
  country: optionalText(100),
  latitude: nullableCoordinate(-90, 90),
  longitude: nullableCoordinate(-180, 180),
  website: optionalUrl,
  social_links: socialLinksSchema,
  opening_hours: openingHoursSchema,
});

export const companyCreateSchema = companyBaseSchema.extend({
  name: z.string().trim().min(2, "Company name must be at least 2 characters.").max(200),
  description: z.preprocess(emptyToNull, z.string().max(5000).nullable().optional()).transform((value) => value ?? ""),
  business_type: z.enum(COMPANY_BUSINESS_TYPES).optional().default("TOUR_OPERATOR"),
  contact_email: optionalEmail.transform((value) => value ?? ""),
  contact_phone: optionalText(30).transform((value) => value ?? ""),
  address: optionalText(500).transform((value) => value ?? ""),
  country: optionalText(100).transform((value) => value ?? "Tanzania"),
}).superRefine((value, context) => {
  const issue = coordinatePairIssue(value.latitude, value.longitude);
  if (issue) {
    context.addIssue({
      code: "custom",
      path: ["latitude"],
      message: issue,
    });
  }
});

export const companyUpdateSchema = companyBaseSchema.partial().extend({
  name: z.string().trim().min(2, "Company name must be at least 2 characters.").max(200).optional(),
  is_public: z
    .union([z.boolean(), z.string()])
    .transform((value) =>
      typeof value === "boolean" ? value : ["true", "1", "on", "yes"].includes(value.toLowerCase()),
    )
    .optional(),
});

/**
 * Fields a company owner or manager may change from the company workspace.
 * Legal identity, registration, status and public visibility are intentionally
 * omitted and remain platform-managed.
 */
export const companyWorkspaceProfileUpdateSchema = companyBaseSchema
  .pick({
    description: true,
    contact_phone: true,
    alternative_phone: true,
    whatsapp_number: true,
    address: true,
    locality: true,
    district: true,
    region: true,
    country: true,
    latitude: true,
    longitude: true,
    website: true,
    social_links: true,
    opening_hours: true,
  })
  .partial()
  .extend({
    remove_logo: booleanishSchema.optional(),
    remove_cover: booleanishSchema.optional(),
  });

const companyTripFields = z.object({
  title: z.string().trim().min(1, "Trip name is required.").max(200),
  place: z.string().trim().min(1, "Place is required.").max(200),
  description: z.string().trim().max(5000).optional().default(""),
  price: z.coerce.number().nonnegative("Price cannot be negative."),
  latitude: nullableCoordinate(-90, 90),
  longitude: nullableCoordinate(-180, 180),
  origin_latitude: nullableCoordinate(-90, 90),
  origin_longitude: nullableCoordinate(-180, 180),
  destination_latitude: nullableCoordinate(-90, 90),
  destination_longitude: nullableCoordinate(-180, 180),
  distance_km: z.coerce.number().nonnegative().optional().nullable(),
  duration_mins: z.coerce.number().int().nonnegative().optional().nullable(),
});

function refineTripCoordinates(
  value: { latitude?: number | null; longitude?: number | null },
  context: z.RefinementCtx,
) {
  const issue = coordinatePairIssue(value.latitude, value.longitude);
  if (issue) {
    context.addIssue({
      code: "custom",
      path: ["latitude"],
      message: issue,
    });
  }
}

export const companyTripCreateSchema = companyTripFields.superRefine(
  refineTripCoordinates,
);

export const companyTripUpdateSchema = companyTripFields
  .partial()
  .superRefine(refineTripCoordinates);

export const companyListQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  status: z.enum(COMPANY_STATUSES).optional(),
  business_type: z.enum(COMPANY_BUSINESS_TYPES).optional(),
  region: z.string().trim().max(120).optional(),
});

export const companyLifecycleSchema = z.object({
  action: z.enum(COMPANY_LIFECYCLE_ACTIONS),
});

export const tourCompanyOwnerCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(150)
    .regex(/^[\w.@+-]+$/, "Username contains invalid characters."),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
});

export const companyMemberAssignSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  role: z.enum(COMPANY_ROLES),
});

export const companyMemberUpdateSchema = z.object({
  role: z.enum(COMPANY_ROLES),
});

export const companySwitchSchema = z.object({
  company_id: z.coerce.number().int().positive(),
});

const itineraryItemSchema = z.object({
  day: z.coerce.number().int().min(1, "Day must be at least 1.").max(365),
  title: z.string().trim().min(1, "Itinerary title is required.").max(200),
  description: z.string().trim().max(2000).optional().default(""),
});

const itineraryListSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  if (!value.trim()) return [];
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}, z.array(itineraryItemSchema).max(60));

const companyTourBaseSchema = tourSchema.omit({ featured: true }).extend({
  max_travelers: z.coerce.number().int().min(1).max(1000),
  publication_status: z.enum(COMPANY_EDITABLE_TOUR_STATUSES),
  itinerary: itineraryListSchema.optional(),
});

export const companyTourCreateSchema = companyTourBaseSchema
  .extend({
    max_travelers: z.coerce.number().int().min(1).max(1000).default(10),
    publication_status: z
      .enum(COMPANY_EDITABLE_TOUR_STATUSES)
      .default("DRAFT"),
  })
  .superRefine((value, context) => {
    const issue = coordinatePairIssue(
      value.destination_lat,
      value.destination_lng,
    );
    if (issue) {
      context.addIssue({
        code: "custom",
        path: ["destination_lat"],
        message: issue,
      });
    }
  });

export const companyTourUpdateSchema = companyTourBaseSchema.partial();

export const companyTourListQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  publication_status: z
    .enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"])
    .optional(),
});

export const companyBookingListQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
  tour: z.coerce.number().int().positive().optional(),
  travel_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid travel date.")
    .optional(),
});

export const companyBookingStatusUpdateSchema = z.object({
  status: z.enum(["confirmed", "cancelled"]),
});

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;
export type CompanyOpeningHoursInput = CompanyOpeningHours | string | null;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
export type CompanyListQuery = z.infer<typeof companyListQuerySchema>;
export type CompanyMemberAssignInput = z.infer<typeof companyMemberAssignSchema>;
export type CompanySwitchInput = z.infer<typeof companySwitchSchema>;
export type CompanyWorkspaceProfileUpdateInput = z.infer<
  typeof companyWorkspaceProfileUpdateSchema
>;
export type CompanyTripCreateInput = z.infer<typeof companyTripCreateSchema>;
export type CompanyTripUpdateInput = z.infer<typeof companyTripUpdateSchema>;
export type CompanyTourCreateInput = z.infer<typeof companyTourCreateSchema>;
export type CompanyTourUpdateInput = z.infer<typeof companyTourUpdateSchema>;
export type CompanyTourListQuery = z.infer<typeof companyTourListQuerySchema>;
export type CompanyBookingListQuery = z.infer<
  typeof companyBookingListQuerySchema
>;
export type CompanyBookingStatusUpdateInput = z.infer<
  typeof companyBookingStatusUpdateSchema
>;

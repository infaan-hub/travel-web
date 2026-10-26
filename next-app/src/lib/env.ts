import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  /** Shared rate-limit store (Upstash Redis). Falls back to in-process memory. */
  RATE_LIMIT_URL: z.string().optional(),
  RATE_LIMIT_TOKEN: z.string().optional(),
  /** Web Push (VAPID) credentials. */
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:admin@travelisland.app"),
  PUSH_ENABLED: z.enum(["true", "false"]).default("true"),
  /** Shared secret protecting scheduled job endpoints. */
  CRON_SECRET: z.string().optional(),
  /** Error monitoring (optional). */
  SENTRY_DSN: z.string().optional(),
  /** Feature flags. */
  FEATURE_BOOKING_REFERENCE: z.enum(["true", "false"]).default("true"),
  FEATURE_GUEST_BOOKING: z.enum(["true", "false"]).default("true"),
  FEATURE_WORKSPACE_TEMPLATES: z.enum(["true", "false"]).default("true"),
  FEATURE_MULTI_CURRENCY: z.enum(["true", "false"]).default("true"),
  FEATURE_AUDIT_LOG: z.enum(["true", "false"]).default("true"),
  WHATSAPP_NUMBER: z.string().default("255711252758"),
  NOMINATIM_USER_AGENT: z
    .string()
    .default("InfaanTravelApp/1.0 (contact@example.com)"),
  NOMINATIM_BASE_URL: z.string().url().default("https://nominatim.openstreetmap.org"),
  /** Shared cache endpoint for geocoding (Upstash Redis). */
  CACHE_URL: z.string().optional(),
  CACHE_TOKEN: z.string().optional(),
  /** SMTP / email delivery (Gmail app password supported). */
  SMTP_HOST: z.string().trim().min(1).default("smtp.gmail.com"),
  /** Google OAuth (server-side). The client secret must never be exposed to the browser. */
  GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().min(1).optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),
  SMTP_USER: z.string().trim().min(1).optional(),
  SMTP_PASS: z.string().trim().min(1).optional(),
  SMTP_FROM: z.string().trim().min(1).optional(),
});

export type ServerEnv = z.infer<typeof EnvSchema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  cached = parsed.data;
  return cached;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function cookieSecure(): boolean {
  if (process.env.AUTH_COOKIE_SECURE === "true") return true;
  if (process.env.AUTH_COOKIE_SECURE === "false") return false;
  return isProduction();
}

/** Feature flag helper. Flags default to enabled unless explicitly disabled. */
export function featureEnabled(flag: keyof ServerEnv): boolean {
  const value = env()[flag];
  return value !== "false";
}

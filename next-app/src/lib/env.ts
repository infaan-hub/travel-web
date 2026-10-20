import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  ADMIN_SETUP_TOKEN: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["local", "supabase"]).default("local"),
  STORAGE_URL: z.string().optional(),
  STORAGE_SERVICE_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().default("tours"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  BOOKING_NOTIFICATION_EMAIL: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  WHATSAPP_NUMBER: z.string().default("255711252758"),
  NOMINATIM_USER_AGENT: z
    .string()
    .default("InfaanTravelApp/1.0 (contact@example.com)"),
  NOMINATIM_BASE_URL: z.string().url().default("https://nominatim.openstreetmap.org"),
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

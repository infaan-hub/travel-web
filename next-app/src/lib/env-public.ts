/**
 * Public runtime configuration for client components. Only `NEXT_PUBLIC_*`
 * variables are exposed; everything else stays on the server.
 */
export const publicEnv = {
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  pushEnabled: process.env.NEXT_PUBLIC_PUSH_ENABLED !== "false",
  multiCurrency: process.env.NEXT_PUBLIC_FEATURE_MULTI_CURRENCY !== "false",
  guestBooking: process.env.NEXT_PUBLIC_FEATURE_GUEST_BOOKING !== "false",
  defaultCurrency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "TZS",
} as const;

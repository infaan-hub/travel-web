import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { optionalAuth, requireUser } from "@/lib/auth/session";
import { readJson } from "@/lib/api/http";
import { bookingCreateSchema } from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { createBooking, listBookingsForUser } from "@/lib/services/bookings";
import { bookingSerializer } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const bookings = await listBookingsForUser(user.id);
    return ok(bookings.map(bookingSerializer));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Guests can request a booking; the account is attached later when the
    // customer signs in with the same email address.
    const context = await optionalAuth(request);
    const body = bookingCreateSchema.parse(await readJson(request));
    if (!context) {
      await enforceRateLimit(request, "guest-booking", 5, 60 * 60 * 1000);
    }
    const booking = await createBooking(context?.user ?? null, body);
    return ok(bookingSerializer(booking), 201);
  } catch (error) {
    return handleApiError(error);
  }
}

import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { readJson } from "@/lib/api/http";
import { bookingCreateSchema } from "@/lib/validation/schemas";
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
    const user = await requireUser(request);
    const body = bookingCreateSchema.parse(await readJson(request));
    const booking = await createBooking(user, body);
    return ok(bookingSerializer(booking), 201);
  } catch (error) {
    return handleApiError(error);
  }
}

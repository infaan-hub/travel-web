import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { bookingUpdateSchema } from "@/lib/validation/schemas";
import { deleteBooking, getBooking, updateBooking } from "@/lib/services/bookings";
import { bookingSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(request);
    const id = parseId((await context.params).id);
    const booking = await getBooking(id);
    // Ownership check lives in the service route; use update's access helper
    // indirectly by checking here to avoid returning another user's record.
    if (!user.isStaff && booking.userId !== user.id) {
      throw new ApiError(404, "Booking not found.");
    }
    return ok(bookingSerializer(booking));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  const user = await requireUser(request);
  const id = parseId((await context.params).id);
  const body = bookingUpdateSchema.parse(await readJson(request));
  const booking = await updateBooking(id, user, body);
  return ok(bookingSerializer(booking));
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    return await update(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    return await update(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(request);
    const id = parseId((await context.params).id);
    await deleteBooking(id, user);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

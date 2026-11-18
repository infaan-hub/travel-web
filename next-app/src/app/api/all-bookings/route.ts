import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { listAllBookings } from "@/lib/services/bookings";
import { bookingSerializer } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    const { searchParams } = new URL(request.url);
    const tour = searchParams.get("tour");
    const userIdParam = searchParams.get("user_id");
    const parsedUserId = userIdParam ? Number(userIdParam) : undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;
    const bookings = await listAllBookings({
      status: searchParams.get("status") ?? undefined,
      tour: tour ? Number(tour) : undefined,
      search: searchParams.get("search") ?? undefined,
      userId: Number.isInteger(parsedUserId) && parsedUserId! > 0 ? parsedUserId : undefined,
      email: searchParams.get("email")?.trim() || undefined,
      limit: Number.isInteger(limit) && limit! > 0 ? limit : undefined,
    });
    return ok(bookings.map(bookingSerializer));
  } catch (error) {
    return handleApiError(error);
  }
}

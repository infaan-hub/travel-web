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
    const bookings = await listAllBookings({
      status: searchParams.get("status") ?? undefined,
      tour: tour ? Number(tour) : undefined,
      search: searchParams.get("search") ?? undefined,
    });
    return ok(bookings.map(bookingSerializer));
  } catch (error) {
    return handleApiError(error);
  }
}

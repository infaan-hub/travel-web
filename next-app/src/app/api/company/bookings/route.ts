import type { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/http";
import { listResponse, paginatedResponse, paginationFrom } from "@/lib/api/pagination";
import { requireCompanyMember } from "@/lib/auth/company";
import { listCompanyBookings } from "@/lib/services/company-workspace";
import { companyBookingListQuerySchema } from "@/lib/validation/company";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyMember(request, {
      permission: "bookings:read",
    });
    const { searchParams } = new URL(request.url);
    const filters = companyBookingListQuerySchema.parse({
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      tour: searchParams.get("tour") || undefined,
      travel_date: searchParams.get("travel_date") || undefined,
    });
    const pagination = paginationFrom(searchParams);
    const { bookings, total } = await listCompanyBookings(
      context.company.id,
      filters,
      pagination,
    );
    return pagination
      ? paginatedResponse(request, bookings, total, pagination)
      : listResponse(bookings, total);
  } catch (error) {
    return handleApiError(error);
  }
}

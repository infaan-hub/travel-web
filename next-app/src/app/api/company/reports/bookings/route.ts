import type { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/api/http";
import { requireCompanyMember } from "@/lib/auth/company";
import prisma from "@/lib/db/prisma";

const MAX_EXPORT_ROWS = 10_000;

function csvCell(value: string | number | null) {
  if (value === null) return "";
  const text = String(value);
  const safe = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function parseReportDate(value: string | null, field: string) {
  if (value === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, `The ${field} date must use YYYY-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ApiError(400, `The ${field} date is not valid.`);
  }
  return date;
}

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyMember(request, {
      permission: "reports:export",
    });
    const from = parseReportDate(request.nextUrl.searchParams.get("from"), "from");
    const to = parseReportDate(request.nextUrl.searchParams.get("to"), "to");
    if (from && to && from > to) {
      throw new ApiError(400, "The from date must not be after the to date.");
    }
    const createdAt =
      from || to
        ? {
            ...(from ? { gte: from } : {}),
            ...(to
              ? { lt: new Date(to.getTime() + 24 * 60 * 60 * 1000) }
              : {}),
          }
        : undefined;
    const bookings = await prisma.booking.findMany({
      where: { companyId: context.company.id, ...(createdAt ? { createdAt } : {}) },
      select: {
        reference: true,
        createdAt: true,
        travelDate: true,
        tourTitleSnapshot: true,
        travelers: true,
        unitPriceAtBooking: true,
        totalPriceAtBooking: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_EXPORT_ROWS + 1,
    });

    if (bookings.length > MAX_EXPORT_ROWS) {
      throw new ApiError(
        413,
        "This company has more than 10,000 bookings. Request a date-filtered export.",
      );
    }

    const rows = [
      [
        "booking_reference",
        "created_at",
        "travel_date",
        "tour",
        "travelers",
        "unit_price_tzs",
        "booking_value_tzs",
        "status",
      ],
      ...bookings.map((booking) => [
        booking.reference,
        booking.createdAt.toISOString(),
        booking.travelDate.toISOString().slice(0, 10),
        booking.tourTitleSnapshot,
        booking.travelers,
        booking.unitPriceAtBooking?.toString() ?? null,
        booking.totalPriceAtBooking?.toString() ?? null,
        booking.status,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const filename = `${context.company.slug}-booking-value-report.csv`;

    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

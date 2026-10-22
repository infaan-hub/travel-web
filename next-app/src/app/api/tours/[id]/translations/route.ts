import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { PUBLIC_TOUR_VISIBILITY } from "@/lib/public-tours";

type Context = { params: Promise<{ id: string }> };

const SUPPORTED_LOCALES = ["en", "sw", "fr", "ar", "de", "es", "zh"];

/** Published translations for a tour. */
export async function GET(_request: NextRequest, context: Context) {
  try {
    const tourId = parseId((await context.params).id);
    const tour = await prisma.tour.findFirst({
      where: { id: tourId, deletedAt: null, AND: [PUBLIC_TOUR_VISIBILITY] },
      select: { id: true },
    });
    if (!tour) throw new ApiError(404, "Tour not found.");
    const translations = await prisma.tourTranslation.findMany({
      where: { tourId },
      orderBy: { locale: "asc" },
    });
    return ok({
      tour_id: tourId,
      translations: translations.map((translation) => ({
        locale: translation.locale,
        title: translation.title,
        description: translation.description,
        short_description: translation.shortDescription,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Creates or updates a translation. */
export async function PUT(request: NextRequest, context: Context) {
  try {
    const staff = await requireStaff(request);
    const tourId = parseId((await context.params).id);
    const tour = await prisma.tour.findFirst({ where: { id: tourId, deletedAt: null } });
    if (!tour) throw new ApiError(404, "Tour not found.");

    const body = (await readJson(request)) as {
      locale?: string;
      title?: string;
      description?: string;
      short_description?: string;
    };
    const locale = (body.locale || "").trim().toLowerCase();
    if (!SUPPORTED_LOCALES.includes(locale)) {
      throw new ApiError(400, `Unsupported locale. Use one of: ${SUPPORTED_LOCALES.join(", ")}.`);
    }
    if (!body.title) throw new ApiError(400, "A translated title is required.");

    const translation = await prisma.tourTranslation.upsert({
      where: { tourId_locale: { tourId, locale } },
      create: {
        tourId,
        locale,
        title: body.title,
        description: body.description ?? "",
        shortDescription: body.short_description ?? "",
      },
      update: {
        title: body.title,
        description: body.description ?? "",
        shortDescription: body.short_description ?? "",
      },
    });

    await recordAudit({
      actorId: staff.id,
      action: "tour.translation_upsert",
      entity: "tour",
      entityId: tourId,
      after: { locale },
    });

    return ok({
      locale: translation.locale,
      title: translation.title,
      description: translation.description,
      short_description: translation.shortDescription,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

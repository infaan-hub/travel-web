import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { requestAuditActor } from "@/lib/api/request-context";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { deleteImage } from "@/lib/storage/images";
import { companyUpdateSchema } from "@/lib/validation/company";
import { getAdminCompany, updateAdminCompany } from "@/lib/services/companies";
import { adminCompanyDetailSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    return ok(adminCompanyDetailSerializer(await getAdminCompany(id)));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  const id = parseId((await context.params).id);
  const user = await requireStaff(request);
  const existing = await prisma.company.findUnique({
    where: { id },
    select: { logoImageKey: true, coverImageKey: true },
  });
  if (!existing) throw new ApiError(404, "Company not found.");

  let logoImageKey: string | null = null;
  let coverImageKey: string | null = null;
  let committed = false;

  try {
    const payload = await readPayload(request);
    const body = companyUpdateSchema.parse(stripFiles(payload));
    logoImageKey = await storeUpload(payload, "logo_image", "companies");
    coverImageKey = await storeUpload(payload, "cover_image", "companies/covers");
    const company = await updateAdminCompany(
      id,
      body,
      requestAuditActor(request, user),
      { logoImageKey, coverImageKey },
    );
    committed = true;

    if (logoImageKey) await deleteImage(existing.logoImageKey);
    if (coverImageKey) await deleteImage(existing.coverImageKey);

    return ok(adminCompanyDetailSerializer(company));
  } catch (error) {
    if (!committed) {
      await Promise.all([deleteImage(logoImageKey), deleteImage(coverImageKey)]);
    }
    return handleApiError(error);
  }
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
    await requireStaff(request);
    const id = parseId((await context.params).id);
    const company = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.company.findUnique({
        where: { id },
        include: {
          memberships: { select: { id: true } },
          tours: {
            select: {
              id: true,
              image: true,
              image2: true,
              image3: true,
              galleryImages: { select: { image: true } },
            },
          },
          trips: { select: { image: true } },
        },
      });
      if (!existing) throw new ApiError(404, "Company not found.");

      const tourIds = existing.tours.map((tour) => tour.id);
      const membershipNotificationTags = existing.memberships.map(
        (membership) => `company-membership-${membership.id}`,
      );
      await transaction.booking.deleteMany({
        where: {
          OR: [
            { companyId: id },
            ...(tourIds.length ? [{ tourId: { in: tourIds } }] : []),
          ],
        },
      });
      await transaction.visitorTracking.deleteMany({
        where: { tourId: { in: tourIds } },
      });
      await transaction.funnelEvent.deleteMany({
        where: { tourId: { in: tourIds } },
      });
      await transaction.auditLog.deleteMany({
        where: {
          OR: [
            { companyId: id },
            { entity: "company", entityId: String(id) },
            ...(tourIds.length
              ? [{ entity: "tour", entityId: { in: tourIds.map(String) } }]
              : []),
          ],
        },
      });
      await transaction.notification.deleteMany({
        where: {
          OR: [
            { companyId: id },
            ...(membershipNotificationTags.length
              ? [{ tag: { in: membershipNotificationTags } }]
              : []),
          ],
        },
      });
      await transaction.tour.deleteMany({ where: { companyId: id } });
      await transaction.company.delete({ where: { id } });
      return existing;
    });

    const imageKeys = [
      company.logoImageKey,
      company.coverImageKey,
      ...company.tours.flatMap((tour) => [
        tour.image,
        tour.image2,
        tour.image3,
        ...tour.galleryImages.map((image) => image.image),
      ]),
      ...company.trips.map((trip) => trip.image),
    ].filter((image): image is string => Boolean(image));
    await Promise.all([...new Set(imageKeys)].map((image) => deleteImage(image)));
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

import "server-only";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/http";
import { recordAudit } from "@/lib/audit";
import prisma from "@/lib/db/prisma";
import { deleteImage } from "@/lib/storage/images";
import { getCompanyTour } from "@/lib/services/company-workspace";
import { notifyCompanyMembersByRole } from "@/lib/services/notifications";
import type {
  CompanyTourCreateInput,
  CompanyTourUpdateInput,
} from "@/lib/validation/company";

type TourActor = {
  id: number;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type TourImageKeys = {
  image?: string | null;
  image2?: string | null;
  image3?: string | null;
};

function itineraryRows(tourId: number, itinerary: { day: number; title: string; description: string }[]) {
  return itinerary.map((item) => ({
    tourId,
    day: item.day,
    title: item.title,
    description: item.description,
  }));
}

export async function createCompanyTour(
  companyId: number,
  actor: TourActor,
  input: CompanyTourCreateInput,
  images: TourImageKeys = {},
) {
  const published = input.publication_status === "PUBLISHED";
  const itinerary = input.itinerary ?? [];

  const tour = await prisma.$transaction(async (tx) => {
    const created = await tx.tour.create({
      data: {
        title: input.title,
        description: input.description,
        shortDescription: input.short_description ?? "",
        price: input.price,
        duration: input.duration,
        destination: input.destination,
        destinationLat: input.destination_lat ?? null,
        destinationLng: input.destination_lng ?? null,
        category: input.category,
        includes: input.includes ?? [],
        excludes: input.excludes ?? [],
        available: input.available ?? true,
        featured: false,
        maxTravelers: input.max_travelers,
        companyId,
        publicationStatus: input.publication_status,
        publishedAt: published ? new Date() : null,
        publishedByUserId: published ? actor.id : null,
        image: images.image ?? null,
        image2: images.image2 ?? null,
        image3: images.image3 ?? null,
      },
    });

    if (itinerary.length > 0) {
      await tx.itineraryItem.createMany({
        data: itineraryRows(created.id, itinerary),
      });
    }

    return created;
  });

  await recordAudit({
    actorId: actor.id,
    companyId,
    action: "company.tour.create",
    entity: "tour",
    entityId: tour.id,
    after: {
      title: tour.title,
      publication_status: tour.publicationStatus,
      available: tour.available,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return getCompanyTour(companyId, tour.id);
}

export async function updateCompanyTour(
  companyId: number,
  tourId: number,
  actor: TourActor,
  input: CompanyTourUpdateInput,
  images: TourImageKeys = {},
) {
  const existing = await prisma.tour.findFirst({
    where: { id: tourId, companyId, deletedAt: null },
  });
  if (!existing) throw new ApiError(404, "Tour not found.");

  const data: Prisma.TourUpdateInput = {};
  const changed: string[] = [];

  if (input.title !== undefined) {
    data.title = input.title;
    changed.push("title");
  }
  if (input.description !== undefined) {
    data.description = input.description;
    changed.push("description");
  }
  if (input.short_description !== undefined) {
    data.shortDescription = input.short_description;
    changed.push("short_description");
  }
  if (input.price !== undefined) {
    data.price = input.price;
    changed.push("price");
  }
  if (input.duration !== undefined) {
    data.duration = input.duration;
    changed.push("duration");
  }
  if (input.destination !== undefined) {
    data.destination = input.destination;
    changed.push("destination");
  }
  if (input.destination_lat !== undefined) {
    data.destinationLat = input.destination_lat;
    changed.push("destination_lat");
  }
  if (input.destination_lng !== undefined) {
    data.destinationLng = input.destination_lng;
    changed.push("destination_lng");
  }
  if (input.category !== undefined) {
    data.category = input.category;
    changed.push("category");
  }
  if (input.includes !== undefined) {
    data.includes = input.includes;
    changed.push("includes");
  }
  if (input.excludes !== undefined) {
    data.excludes = input.excludes;
    changed.push("excludes");
  }
  if (input.available !== undefined) {
    data.available = input.available;
    changed.push("available");
  }
  if (input.max_travelers !== undefined) {
    data.maxTravelers = input.max_travelers;
    changed.push("max_travelers");
  }
  if (input.publication_status !== undefined) {
    const nextStatus = input.publication_status;
    data.publicationStatus = nextStatus;
    if (nextStatus === "PUBLISHED") {
      if (existing.publicationStatus !== "PUBLISHED") {
        data.publishedAt = new Date();
        data.publishedBy = { connect: { id: actor.id } };
      }
    } else {
      data.publishedAt = null;
      data.publishedBy = { disconnect: true };
    }
    changed.push("publication_status");
  }
  if (images.image !== undefined) {
    data.image = images.image;
    changed.push("image");
  }
  if (images.image2 !== undefined) {
    data.image2 = images.image2;
    changed.push("image2");
  }
  if (images.image3 !== undefined) {
    data.image3 = images.image3;
    changed.push("image3");
  }

  const hasItinerary = input.itinerary !== undefined;

  if (changed.length === 0 && !hasItinerary) {
    return getCompanyTour(companyId, tourId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.tour.update({ where: { id: tourId }, data });

    if (hasItinerary) {
      await tx.itineraryItem.deleteMany({ where: { tourId } });
      const rows = input.itinerary ?? [];
      if (rows.length > 0) {
        await tx.itineraryItem.createMany({
          data: itineraryRows(tourId, rows),
        });
      }
      changed.push("itinerary");
    }
  });

  const replacedImages = [
    images.image !== undefined ? existing.image : null,
    images.image2 !== undefined ? existing.image2 : null,
    images.image3 !== undefined ? existing.image3 : null,
  ].filter((key): key is string => Boolean(key));
  if (replacedImages.length > 0) {
    await Promise.all(replacedImages.map((key) => deleteImage(key)));
  }

  await recordAudit({
    actorId: actor.id,
    companyId,
    action: "company.tour.update",
    entity: "tour",
    entityId: tourId,
    before: {
      title: existing.title,
      publication_status: existing.publicationStatus,
      available: existing.available,
    },
    after: {
      changed,
      publication_status: data.publicationStatus ?? existing.publicationStatus,
      available: data.available ?? existing.available,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  if (input.publication_status && input.publication_status !== existing.publicationStatus) {
    await notifyCompanyMembersByRole(
      companyId,
      ["OWNER", "MANAGER"],
      {
        title:
          input.publication_status === "PUBLISHED"
            ? "Tour published"
            : "Tour updated",
        body: `${existing.title} is now ${input.publication_status.toLowerCase().replace(/_/g, " ")}.`,
        url: `/company/tours/${tourId}/`,
        tag: `tour-${tourId}-publication-${input.publication_status}`,
      },
    );
  }

  return getCompanyTour(companyId, tourId);
}

export async function deleteCompanyTour(
  companyId: number,
  tourId: number,
  actor: TourActor,
) {
  const existing = await prisma.tour.findFirst({
    where: { id: tourId, companyId, deletedAt: null },
  });
  if (!existing) throw new ApiError(404, "Tour not found.");

  await prisma.tour.update({
    where: { id: tourId },
    data: {
      deletedAt: new Date(),
      available: false,
      publicationStatus: "ARCHIVED",
      publishedAt: null,
      publishedBy: { disconnect: true },
    },
  });

  await recordAudit({
    actorId: actor.id,
    companyId,
    action: "company.tour.archive",
    entity: "tour",
    entityId: tourId,
    before: {
      title: existing.title,
      publication_status: existing.publicationStatus,
      available: existing.available,
    },
    after: { archived: true },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
}

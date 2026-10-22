import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { optionalAuth, requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { listResponse, paginatedResponse, paginationFrom } from "@/lib/api/pagination";
import { tourSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { tourListSerializer } from "@/lib/serializers";
import { PUBLIC_TOUR_VISIBILITY } from "@/lib/public-tours";
import type { Prisma, TourCategory } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const where: Prisma.TourWhereInput = {
      deletedAt: null,
      AND: [PUBLIC_TOUR_VISIBILITY],
    };

    const category = searchParams.get("category");
    if (category && ["zanzibar", "tanzania", "international"].includes(category)) {
      where.category = category as TourCategory;
    }

    const destination = searchParams.get("destination");
    if (destination) where.destination = { contains: destination, mode: "insensitive" };

    if (["true", "1"].includes(searchParams.get("featured") ?? "")) where.featured = true;
    if (["false", "0"].includes(searchParams.get("available") ?? "")) where.available = false;

    const search = searchParams.get("search");
    if (search) {
      const or: Prisma.TourWhereInput[] = [
        { title: { contains: search, mode: "insensitive" } },
        { destination: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
      if (["zanzibar", "tanzania", "international"].includes(search)) {
        or.push({ category: search as TourCategory });
      }
      where.OR = or;
    }

    const ordering = searchParams.get("ordering") || "-created_at";
    const orderMap: Record<string, Prisma.TourOrderByWithRelationInput> = {
      price: { price: "asc" },
      "-price": { price: "desc" },
      created_at: { createdAt: "asc" },
      "-created_at": { createdAt: "desc" },
      duration: { duration: "asc" },
      "-duration": { duration: "desc" },
    };
    const orderBy = orderMap[ordering] ?? { createdAt: "desc" };

    const pagination = paginationFrom(searchParams);
    const [tours, total] = await Promise.all([
      prisma.tour.findMany({
        where,
        orderBy,
        include: {
          reviews: true,
          company: { select: { name: true, slug: true } },
        },
        skip: pagination?.skip ?? 0,
        take: pagination?.take ?? 500,
      }),
      prisma.tour.count({ where }),
    ]);

    const data = tours.map((tour) => tourListSerializer(tour));
    return pagination ? paginatedResponse(request, data, total, pagination) : listResponse(data, total);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff(request);
    const payload = await readPayload(request);
    const body = tourSchema.parse(stripFiles(payload));

    const image = await storeUpload(payload, "image", "tours");
    const image2 = await storeUpload(payload, "image2", "tours");
    const image3 = await storeUpload(payload, "image3", "tours");

    const tour = await prisma.tour.create({
      data: {
        title: body.title,
        description: body.description,
        shortDescription: body.short_description ?? "",
        price: body.price,
        duration: body.duration,
        destination: body.destination,
        destinationLat: body.destination_lat,
        destinationLng: body.destination_lng,
        category: body.category,
        includes: body.includes ?? [],
        excludes: body.excludes ?? [],
        available: body.available ?? true,
        featured: body.featured ?? false,
        image,
        image2,
        image3,
      },
      include: { galleryImages: true, itinerary: true, reviews: true },
    });

    const { tourDetailSerializer } = await import("@/lib/serializers");
    return ok(tourDetailSerializer(tour), 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// Ensure authenticated visitors can be distinguished from anonymous ones
// without changing the public behaviour of the endpoint.
export async function OPTIONS(request: NextRequest) {
  await optionalAuth(request);
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}

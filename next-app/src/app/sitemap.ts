import type { MetadataRoute } from "next";
import prisma from "@/lib/db/prisma";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const staticRoutes = [
    { path: "", priority: 1 },
    { path: "/tours/", priority: 0.9 },
    { path: "/tours/zanzibar/", priority: 0.8 },
    { path: "/tours/tanzania/", priority: 0.8 },
    { path: "/trips/", priority: 0.7 },
    { path: "/contact/", priority: 0.6 },
    { path: "/login/", priority: 0.4 },
    { path: "/register/", priority: 0.4 },
  ];

  const entries = staticRoutes.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route.priority,
  }));

  // The database may be unavailable during a build; the sitemap must never
  // break the production build.
  try {
    const [tours, trips] = await Promise.all([
      prisma.tour.findMany({
        where: { deletedAt: null, available: true },
        select: { id: true, updatedAt: true },
      }),
      prisma.companyTrip.findMany({
        where: { company: { status: "ACTIVE" as any, isPublic: true } },
        select: { id: true, updatedAt: true },
      }),
    ]);

    return [
      ...entries,
      ...tours.map((tour) => ({
        url: `${base}/tour/${tour.id}/`,
        lastModified: tour.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...trips.map((trip) => ({
        url: `${base}/trips/#${trip.id}`,
        lastModified: trip.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ];
  } catch (error) {
    console.error("sitemap: database unavailable, serving static routes only", error);
    return entries;
  }
}

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
    { path: "/attractions/", priority: 0.8 },
    { path: "/trips/", priority: 0.7 },
    { path: "/contact/", priority: 0.6 },
    { path: "/login/", priority: 0.4 },
    { path: "/register/", priority: 0.4 },
  ];

  const [tours, attractions, tips] = await Promise.all([
    prisma.tour.findMany({
      where: { deletedAt: null, available: true },
      select: { id: true, updatedAt: true },
    }),
    prisma.attraction.findMany({
      where: { deletedAt: null },
      select: { id: true, updatedAt: true },
    }),
    prisma.travelTip.findMany({
      where: { deletedAt: null, published: true },
      select: { id: true, updatedAt: true },
    }),
  ]);

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route.path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route.priority,
    })),
    ...tours.map((tour) => ({
      url: `${base}/tour/${tour.id}/`,
      lastModified: tour.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...attractions.map((attraction) => ({
      url: `${base}/attractions/#${attraction.id}`,
      lastModified: attraction.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...tips.map((tip) => ({
      url: `${base}/trips/#${tip.id}`,
      lastModified: tip.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server-guard";
import prisma from "@/lib/db/prisma";
import { publicImageUrl } from "@/lib/storage/images";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo";
import TripDetailPage from "@/features/pages/TripDetailPage";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const trip = await prisma.companyTrip.findUnique({
    where: { id: Number(id) },
    include: { company: { select: { name: true, status: true, isPublic: true } } },
  });
  if (!trip || !trip.company || trip.company.status !== "ACTIVE" || !trip.company.isPublic) {
    return { title: "Trip not found" };
  }
  const description = trip.description || `Trip from ${trip.place}.`;
  const image = publicImageUrl(trip.image);
  const ogImages = image ? [{ url: image, alt: trip.title }] : [DEFAULT_OG_IMAGE];
  return {
    title: trip.title,
    description,
    openGraph: {
      siteName: SITE_NAME,
      title: `${trip.title} | ${SITE_NAME}`,
      description,
      images: ogImages,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${trip.title} | ${SITE_NAME}`,
      description,
      images: [image ?? DEFAULT_OG_IMAGE.url],
    },
  };
}

export default async function Page({ params }: Params) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(`/login/?from=${encodeURIComponent(`/trips/${id}/`)}`);
  }
  const trip = await prisma.companyTrip.findUnique({
    where: { id: Number(id) },
    include: { company: { select: { name: true, slug: true, status: true, isPublic: true } } },
  });
  if (!trip || !trip.company || trip.company.status !== "ACTIVE" || !trip.company.isPublic) {
    notFound();
  }
  return <TripDetailPage />;
}
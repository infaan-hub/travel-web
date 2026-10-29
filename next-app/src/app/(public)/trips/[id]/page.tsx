import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { publicImageUrl } from "@/lib/storage/images";
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
  return {
    title: trip.title,
    description,
    openGraph: {
      title: `${trip.title} | Travel.`,
      description,
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
  };
}

export default async function Page({ params }: Params) {
  const { id } = await params;
  const trip = await prisma.companyTrip.findUnique({
    where: { id: Number(id) },
    include: { company: { select: { name: true, slug: true, status: true, isPublic: true } } },
  });
  if (!trip || !trip.company || trip.company.status !== "ACTIVE" || !trip.company.isPublic) {
    notFound();
  }
  return <TripDetailPage />;
}
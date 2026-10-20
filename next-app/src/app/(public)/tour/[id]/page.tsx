import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { publicImageUrl } from "@/lib/storage/images";
import TourDetailPage from "@/features/pages/TourDetailPage";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const tour = await prisma.tour.findFirst({
    where: { id: Number(id), deletedAt: null },
    select: { title: true, shortDescription: true, description: true, destination: true, image: true },
  });
  if (!tour) return { title: "Tour not found" };
  const description =
    tour.shortDescription || tour.description.slice(0, 155) || `Explore ${tour.title} in ${tour.destination}.`;
  const image = publicImageUrl(tour.image);
  return {
    title: tour.title,
    description,
    openGraph: {
      title: `${tour.title} | Travel.`,
      description,
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: tour.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function Page({ params }: Params) {
  const { id } = await params;
  const tour = await prisma.tour.findFirst({
    where: { id: Number(id), deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      shortDescription: true,
      destination: true,
      price: true,
      duration: true,
      image: true,
      category: true,
    },
  });
  if (!tour) notFound();

  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: tour.title,
    description: tour.shortDescription || tour.description.slice(0, 300),
    touristType: "Leisure travellers",
    itinerary: {
      "@type": "ItemList",
      numberOfItems: 1,
      itemListElement: [
        {
          "@type": "TouristAttraction",
          name: tour.title,
          description: tour.description.slice(0, 300),
          image: publicImageUrl(tour.image),
          url: `${base}/tour/${tour.id}/`,
        },
      ],
    },
    offers: {
      "@type": "Offer",
      price: Number(tour.price),
      priceCurrency: "TZS",
      availability: "https://schema.org/InStock",
      url: `${base}/tour/${tour.id}/`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Structured data for search engines.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TourDetailPage />
    </>
  );
}

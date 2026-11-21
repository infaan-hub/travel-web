import type { Metadata } from "next";
import prisma from "@/lib/db/prisma";
import PrivateHireServiceDetailPage from "@/features/pages/PrivateHireServiceDetailPage";
import { publicImageUrl } from "@/lib/storage/images";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo";

type Params = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const service = await prisma.privateHireService.findFirst({ where: { id: Number(id), isActive: true }, select: { title: true, description: true, vehicle: { select: { frontImage: true } } } });
  if (!service) return { title: "Private hire service not found" };
  const description = service.description || "Arrange a private vehicle and driver for your journey.";
  const image = publicImageUrl(service.vehicle?.frontImage);
  const ogImages = image ? [{ url: image, alt: service.title }] : [DEFAULT_OG_IMAGE];
  return {
    title: `${service.title} | Private Hire`,
    description,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${service.title} | ${SITE_NAME}`,
      description,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${service.title} | ${SITE_NAME}`,
      description,
      images: [image ?? DEFAULT_OG_IMAGE.url],
    },
  };
}
export default function Page() { return <PrivateHireServiceDetailPage />; }

import type { Metadata } from "next";
import prisma from "@/lib/db/prisma";
import PrivateHireServiceDetailPage from "@/features/pages/PrivateHireServiceDetailPage";
import { publicImageUrl } from "@/lib/storage/images";

type Params = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const service = await prisma.privateHireService.findFirst({ where: { id: Number(id), isActive: true }, select: { title: true, description: true, vehicle: { select: { frontImage: true } } } });
  if (!service) return { title: "Private hire service not found" };
  const description = service.description || "Arrange a private vehicle and driver for your journey.";
  const image = publicImageUrl(service.vehicle?.frontImage);
  return { title: service.title + " | Private Hire", description, openGraph: { title: service.title + " | Travel.", description, images: image ? [{ url: image }] : undefined } };
}
export default function Page() { return <PrivateHireServiceDetailPage />; }

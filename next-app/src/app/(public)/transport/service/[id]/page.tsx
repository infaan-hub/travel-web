import type { Metadata } from "next";
import prisma from "@/lib/db/prisma";
import TransportServiceDetailPage from "@/features/pages/TransportServiceDetailPage";
import { publicImageUrl } from "@/lib/storage/images";
import { SAMPLE_PRIVATE_HIRE_SERVICES } from "@/features/transport/private-hire-data";

type Params = { params: Promise<{ id: string }> };

function sampleMetadata(id: string): Metadata | null {
  const sample = SAMPLE_PRIVATE_HIRE_SERVICES.find((item) => String(item.id) === id);
  if (!sample) return null;
  const image = sample.vehicle?.front_image_url ?? null;
  return {
    title: `${sample.title} | Transport`,
    description: sample.description,
    openGraph: {
      title: `${sample.title} | Travel.`,
      description: sample.description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  try {
    const service = await prisma.privateHireService.findFirst({
      where: { id: Number(id), isActive: true },
      select: {
        title: true,
        description: true,
        vehicle: { select: { frontImage: true } },
      },
    });
    if (service) {
      const description = service.description || "Book a private vehicle and driver for your journey.";
      const image = publicImageUrl(service.vehicle?.frontImage);
      return {
        title: `${service.title} | Transport`,
        description,
        openGraph: {
          title: `${service.title} | Travel.`,
          description,
          images: image ? [{ url: image }] : undefined,
        },
      };
    }
  } catch {
    // The database can be unavailable while the public API still serves data.
  }
  return sampleMetadata(id) ?? { title: "Transport service not found" };
}

export default async function Page({ params }: Params) {
  const { id } = await params;
  return <TransportServiceDetailPage key={id} id={id} />;
}

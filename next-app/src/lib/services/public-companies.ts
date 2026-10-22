import "server-only";
import prisma from "@/lib/db/prisma";
import {
  companyPublicSerializer,
  companyPublicDetailSerializer,
} from "@/lib/serializers";

export type PublicCompanyFilters = {
  search?: string;
  business_type?: string;
  region?: string;
  locality?: string;
  page?: number;
  page_size?: number;
};

const PUBLIC_COMPANY_WHERE = {
  status: "ACTIVE" as const,
  isPublic: true,
};

export async function listPublicCompanies(filters: PublicCompanyFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.page_size ?? 12));
  const search = filters.search?.trim();

  const where: any = { ...PUBLIC_COMPANY_WHERE };
  if (filters.business_type) where.businessType = filters.business_type;
  if (filters.region) where.region = { contains: filters.region, mode: "insensitive" };
  if (filters.locality) where.locality = { contains: filters.locality, mode: "insensitive" };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { region: { contains: search, mode: "insensitive" } },
      { district: { contains: search, mode: "insensitive" } },
      { locality: { contains: search, mode: "insensitive" } },
    ];
  }

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { tours: { where: { publicationStatus: "PUBLISHED", deletedAt: null } } } },
      },
    }),
    prisma.company.count({ where }),
  ]);

  return {
    results: companies.map((company) => companyPublicSerializer(company)),
    total,
    page,
    page_size: pageSize,
  };
}

export async function getPublicCompany(slug: string) {
  const company = await prisma.company.findFirst({
    where: { ...PUBLIC_COMPANY_WHERE, slug },
    include: {
      tours: {
        where: { publicationStatus: "PUBLISHED", deletedAt: null },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        include: {
          reviews: { where: { status: "approved" } },
          galleryImages: { orderBy: { order: "asc" } },
          company: { select: { name: true, slug: true } },
        },
      },
    },
  });
  if (!company) return null;

  const reviewAggregate = await prisma.review.aggregate({
    where: { status: "approved", tour: { companyId: company.id, publicationStatus: "PUBLISHED", deletedAt: null },
    },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return companyPublicDetailSerializer(company, {
    averageRating: reviewAggregate._avg?.rating ?? null,
    reviewCount: reviewAggregate._count?._all ?? 0,
  });
}


import "server-only";
import prisma from "@/lib/db/prisma";
import {
  companyPublicSerializer,
  companyPublicDetailSerializer,
} from "@/lib/serializers";

export type PublicCompanyFilters = {
  search?: string;
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
        privateHireServices: {
          where: { isActive: true },
          orderBy: [{ createdAt: "desc" }],
          include: {
            vehicle: true,
            driver: true,
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                contactPhone: true,
                contactEmail: true,
                logoImageKey: true,
              },
            },
          },
        },
        _count: {
          select: {
            privateHireServices: { where: { isActive: true } },
            trips: true,
          },
        },
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
      privateHireServices: {
        where: { isActive: true },
        orderBy: [{ createdAt: "desc" }],
        include: {
          vehicle: true,
          driver: true,
          company: { select: { id: true, name: true, slug: true, contactPhone: true, contactEmail: true, logoImageKey: true } },
        },
      },
      trips: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!company) return null;

  return companyPublicDetailSerializer(company, {
    averageRating: null,
    reviewCount: 0,
  });
}

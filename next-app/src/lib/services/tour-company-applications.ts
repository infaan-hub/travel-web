import "server-only";
import { ApiError } from "@/lib/api/http";
import { recordAudit } from "@/lib/audit";
import prisma from "@/lib/db/prisma";
import {
  companySlugCandidate,
  normalizeCompanySlug,
} from "@/lib/company-domain";
import type { CompanyCreateInput } from "@/lib/validation/company";

type ApplicationActor = {
  id: number;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function createTourCompanyApplication(
  input: CompanyCreateInput,
  actor: ApplicationActor,
  images: { logoImageKey?: string | null; coverImageKey?: string | null } = {},
) {
  const baseSlug = input.slug
    ? normalizeCompanySlug(input.slug)
    : normalizeCompanySlug(input.name);
  if (!baseSlug) {
    throw new ApiError(400, "Enter a URL-safe company name or slug.", {
      slug: ["Use letters, numbers and hyphens."],
    });
  }

  const existingMembership = await prisma.companyMembership.findFirst({
    where: { userId: actor.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (existingMembership) {
    throw new ApiError(409, "A company application or workspace already exists.");
  }

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const slug = companySlugCandidate(baseSlug, attempt);
    try {
      const company = await prisma.$transaction(async (tx) => {
        const created = await tx.company.create({
          data: {
            name: input.name,
            slug,
            description: input.description,
            registrationReference: input.registration_reference ?? null,
            businessType: input.business_type,
            contactEmail: input.contact_email,
            contactPhone: input.contact_phone,
            alternativePhone: input.alternative_phone ?? null,
            whatsappNumber: input.whatsapp_number ?? null,
            address: input.address,
            locality: input.locality ?? null,
            district: input.district ?? null,
            region: input.region ?? null,
            country: input.country,
            latitude: input.latitude ?? null,
            longitude: input.longitude ?? null,
            website: input.website ?? null,
            socialLinks: input.social_links ?? undefined,
            openingHours: input.opening_hours ?? undefined,
            status: "PENDING",
            isPublic: false,
            createdByUserId: actor.id,
            logoImageKey: images.logoImageKey ?? null,
            coverImageKey: images.coverImageKey ?? null,
          },
        });
        await tx.companyMembership.create({
          data: {
            companyId: created.id,
            userId: actor.id,
            role: "OWNER",
            status: "ACTIVE",
            assignedByUserId: actor.id,
          },
        });
        return created;
      });

      await recordAudit({
        actorId: actor.id,
        companyId: company.id,
        action: "company.application.submit",
        entity: "company",
        entityId: company.id,
        after: { name: company.name, slug: company.slug, status: company.status },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
      return company;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        if (input.slug) {
          throw new ApiError(400, "This company URL is already in use.", {
            slug: ["This company URL is already in use."],
          });
        }
        continue;
      }
      throw error;
    }
  }

  throw new ApiError(409, "Could not allocate a unique company URL.");
}

// @ts-nocheck
import "server-only";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/http";
import { recordAudit } from "@/lib/audit";
import {
  companySlugCandidate,
  nextCompanyStatus,
  normalizeCompanySlug,
  publicCompanyPath,
  canCompanyBePublic,
  coordinatePairIssue,
} from "@/lib/company-domain";
const COMPANY_LIST_INCLUDE = {
    createdBy: {
        select: {
            id: true,
            username: true
        }
    },
    memberships: {
        where: {
            status: "ACTIVE"
        },
        select: {
            id: true,
            role: true
        }
    },
    _count: {
        select: {
            tours: {
                where: {
                    deletedAt: null
                }
            },
            bookings: true
        }
    }
};
const COMPANY_DETAIL_INCLUDE = {
    ...COMPANY_LIST_INCLUDE,
    memberships: {
        include: {
            user: {
                include: {
                    profile: true
                }
            },
            assignedBy: {
                select: {
                    id: true,
                    username: true
                }
            }
        },
        orderBy: [
            {
                status: "asc"
            },
            {
                createdAt: "desc"
            }
        ]
    }
};
function isUniqueConstraintError(error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
function cleanSocialLinks(value) {
    if (!value) return Prisma.DbNull;
    const entries = Object.entries(value).filter((entry)=>typeof entry[1] === "string" && entry[1].trim().length > 0);
    if (entries.length === 0) return Prisma.DbNull;
    return Object.fromEntries(entries);
}
function companyAuditSnapshot(company) {
    return {
        name: company.name,
        slug: company.slug,
        description: company.description,
        registrationReference: company.registrationReference,
        businessType: company.businessType,
        contactEmail: company.contactEmail,
        contactPhone: company.contactPhone,
        alternativePhone: company.alternativePhone,
        whatsappNumber: company.whatsappNumber,
        address: company.address,
        locality: company.locality,
        district: company.district,
        region: company.region,
        country: company.country,
        latitude: company.latitude,
        longitude: company.longitude,
        website: company.website,
        socialLinks: company.socialLinks,
        openingHours: company.openingHours,
        status: company.status,
        isPublic: company.isPublic,
        logoImageKey: company.logoImageKey,
        coverImageKey: company.coverImageKey
    };
}
function createData(input, slug) {
    return {
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
        ...input.social_links !== undefined ? {
            socialLinks: cleanSocialLinks(input.social_links)
        } : {},
        openingHours: input.opening_hours ?? null
    };
}
function updateData(input, existing, slug) {
    const data = {};
    if (input.name !== undefined) data.name = input.name;
    if (slug !== undefined) data.slug = slug;
    if (input.description !== undefined) data.description = input.description ?? "";
    if (input.registration_reference !== undefined) {
        data.registrationReference = input.registration_reference;
    }
    if (input.business_type !== undefined) data.businessType = input.business_type;
    if (input.contact_email !== undefined) data.contactEmail = input.contact_email ?? "";
    if (input.contact_phone !== undefined) data.contactPhone = input.contact_phone ?? "";
    if (input.alternative_phone !== undefined) data.alternativePhone = input.alternative_phone;
    if (input.whatsapp_number !== undefined) data.whatsappNumber = input.whatsapp_number;
    if (input.address !== undefined) data.address = input.address ?? "";
    if (input.locality !== undefined) data.locality = input.locality;
    if (input.district !== undefined) data.district = input.district;
    if (input.region !== undefined) data.region = input.region;
    if (input.country !== undefined) data.country = input.country ?? "Tanzania";
    if (input.website !== undefined) data.website = input.website;
    if (input.opening_hours !== undefined) data.openingHours = input.opening_hours;
    if (input.social_links !== undefined) {
        data.socialLinks = cleanSocialLinks(input.social_links);
    }
    if (input.latitude !== undefined || input.longitude !== undefined) {
        const latitude = input.latitude !== undefined ? input.latitude : existing.latitude;
        const longitude = input.longitude !== undefined ? input.longitude : existing.longitude;
        const issue = (0, coordinatePairIssue)(latitude, longitude);
        if (issue) {
            throw new ApiError(400, issue, {
                latitude: [
                    issue
                ],
                longitude: [
                    issue
                ]
            });
        }
        data.latitude = latitude ?? null;
        data.longitude = longitude ?? null;
    }
    if (input.is_public !== undefined) {
        if (input.is_public && !(0, canCompanyBePublic)(existing.status)) {
            const message = "Only an active company can be made public.";
            throw new ApiError(400, message, {
                is_public: [
                    message
                ]
            });
        }
        data.isPublic = input.is_public;
    }
    return data;
}

async function listAdminCompanies(filters, pagination) {
    const where = {};
    if (filters.search) {
        where.OR = [
            {
                name: {
                    contains: filters.search,
                    mode: "insensitive"
                }
            },
            {
                slug: {
                    contains: filters.search,
                    mode: "insensitive"
                }
            },
            {
                contactEmail: {
                    contains: filters.search,
                    mode: "insensitive"
                }
            },
            {
                registrationReference: {
                    contains: filters.search,
                    mode: "insensitive"
                }
            },
            {
                region: {
                    contains: filters.search,
                    mode: "insensitive"
                }
            },
            {
                district: {
                    contains: filters.search,
                    mode: "insensitive"
                }
            },
            {
                locality: {
                    contains: filters.search,
                    mode: "insensitive"
                }
            }
        ];
    }
    if (filters.status) where.status = filters.status;
    if (filters.business_type) where.businessType = filters.business_type;
    if (filters.region) where.region = {
        contains: filters.region,
        mode: "insensitive"
    };
    const [total, companies] = await prisma.$transaction([
        prisma.company.count({
            where
        }),
        prisma.company.findMany({
            where,
            include: COMPANY_LIST_INCLUDE,
            orderBy: {
                createdAt: "desc"
            },
            ...pagination ? {
                skip: pagination.skip,
                take: pagination.take
            } : {}
        })
    ]);
    return {
        companies,
        total
    };
}
async function getAdminCompany(id) {
    const company = await prisma.company.findUnique({
        where: {
            id
        },
        include: COMPANY_DETAIL_INCLUDE
    });
    if (!company) throw new ApiError(404, "Company not found.");
    const [tours, bookings, bookingCounts, toursTotal, toursPublished, auditLogs] = await Promise.all([
        prisma.tour.findMany({
            where: {
                companyId: id,
                deletedAt: null
            },
            select: {
                id: true,
                title: true,
                price: true,
                duration: true,
                destination: true,
                publicationStatus: true,
                available: true,
                updatedAt: true,
                _count: {
                    select: {
                        bookings: true
                    }
                }
            },
            orderBy: {
                updatedAt: "desc"
            },
            take: 20
        }),
        prisma.booking.findMany({
            where: {
                companyId: id
            },
            select: {
                id: true,
                reference: true,
                fullName: true,
                travelers: true,
                travelDate: true,
                status: true,
                tourTitleSnapshot: true,
                createdAt: true
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 20
        }),
        prisma.booking.groupBy({
            by: [
                "status"
            ],
            where: {
                companyId: id
            },
            _count: {
                _all: true
            },
            _sum: {
                travelers: true
            }
        }),
        prisma.tour.count({
            where: {
                companyId: id,
                deletedAt: null
            }
        }),
        prisma.tour.count({
            where: {
                companyId: id,
                deletedAt: null,
                publicationStatus: "PUBLISHED"
            }
        }),
        prisma.auditLog.findMany({
            where: {
                OR: [
                    {
                        companyId: id
                    },
                    {
                        entity: "company",
                        entityId: String(id)
                    }
                ]
            },
            include: {
                actor: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 20
        })
    ]);
    const counts = new Map(bookingCounts.map((row)=>[
            row.status,
            row._count._all
        ]));
    const travelersTotal = bookingCounts.reduce((sum, row)=>sum + (row._sum.travelers ?? 0), 0);
    return {
        company,
        tours,
        bookings,
        auditLogs,
        stats: {
            members_active: company.memberships.filter((item)=>item.status === "ACTIVE").length,
            tours_total: toursTotal,
            tours_published: toursPublished,
            bookings_total: bookingCounts.reduce((sum, row)=>sum + row._count._all, 0),
            bookings_pending: counts.get("pending") ?? 0,
            bookings_confirmed: counts.get("confirmed") ?? 0,
            bookings_cancelled: counts.get("cancelled") ?? 0,
            travelers_total: travelersTotal
        },
        publicPath: (0, publicCompanyPath)(company.slug)
    };
}
async function createAdminCompany(input, actor, images = {}) {
    const requestedSlug = input.slug ? (0, normalizeCompanySlug)(input.slug) : null;
    if (input.slug && !requestedSlug) {
        throw new ApiError(400, "Enter a URL-safe slug.", {
            slug: [
                "Use letters, numbers and hyphens."
            ]
        });
    }
    const baseSlug = requestedSlug ?? (0, normalizeCompanySlug)(input.name);
    if (!baseSlug) {
        throw new ApiError(400, "Could not generate a slug from this name.", {
            slug: [
                "Enter a URL-safe slug."
            ]
        });
    }
    let company = null;
    for(let attempt = 1; attempt <= 20; attempt += 1){
        const slug = (0, companySlugCandidate)(baseSlug, attempt);
        try {
            company = await prisma.company.create({
                data: {
                    ...createData(input, slug),
                    status: "PENDING",
                    isPublic: false,
                    createdByUserId: actor.id,
                    logoImageKey: images.logoImageKey ?? null,
                    coverImageKey: images.coverImageKey ?? null
                }
            });
            break;
        } catch (error) {
            if (!isUniqueConstraintError(error)) throw error;
            if (requestedSlug) {
                throw new ApiError(400, "This slug is already in use.", {
                    slug: [
                        "This slug is already in use."
                    ]
                });
            }
        }
    }
    if (!company) {
        throw new ApiError(409, "Could not allocate a unique company slug. Please choose a different name or slug.");
    }
    await (0, recordAudit)({
        actorId: actor.id,
        companyId: company.id,
        action: "company.create",
        entity: "company",
        entityId: company.id,
        after: companyAuditSnapshot(company),
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent
    });
    return prisma.company.findUniqueOrThrow({
        where: {
            id: company.id
        },
        include: COMPANY_LIST_INCLUDE
    });
}
async function updateAdminCompany(id, input, actor, images = {}) {
    const existing = await prisma.company.findUnique({
        where: {
            id
        }
    });
    if (!existing) throw new ApiError(404, "Company not found.");
    let slug;
    if (input.slug !== undefined) {
        const source = input.slug ?? input.name ?? existing.name;
        const normalized = (0, normalizeCompanySlug)(source);
        if (!normalized) {
            throw new ApiError(400, "Enter a URL-safe slug.", {
                slug: [
                    "Use letters, numbers and hyphens."
                ]
            });
        }
        if (normalized !== existing.slug) {
            const conflict = await prisma.company.findFirst({
                where: {
                    slug: normalized,
                    id: {
                        not: id
                    }
                },
                select: {
                    id: true
                }
            });
            if (conflict) {
                throw new ApiError(400, "This slug is already in use.", {
                    slug: [
                        "This slug is already in use."
                    ]
                });
            }
            slug = normalized;
        }
    }
    const data = updateData(input, existing, slug);
    if (images.logoImageKey) data.logoImageKey = images.logoImageKey;
    if (images.coverImageKey) data.coverImageKey = images.coverImageKey;
    let updated;
    try {
        if (data.isPublic === true) {
            const result = await prisma.company.updateMany({
                where: {
                    id,
                    status: "ACTIVE"
                },
                data
            });
            if (result.count === 0) {
                throw new ApiError(400, "Only an active company can be made public.", {
                    is_public: [
                        "Only an active company can be made public."
                    ]
                });
            }
            const row = await prisma.company.findUnique({
                where: {
                    id
                }
            });
            if (!row) throw new ApiError(404, "Company not found.");
            updated = row;
        } else {
            updated = await prisma.company.update({
                where: {
                    id
                },
                data
            });
        }
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new ApiError(400, "This slug is already in use.", {
                slug: [
                    "This slug is already in use."
                ]
            });
        }
        throw error;
    }
    await (0, recordAudit)({
        actorId: actor.id,
        companyId: id,
        action: "company.update",
        entity: "company",
        entityId: id,
        before: companyAuditSnapshot(existing),
        after: companyAuditSnapshot(updated),
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent
    });
    if (existing.slug !== updated.slug) {
        await (0, recordAudit)({
            actorId: actor.id,
            companyId: id,
            action: "company.slug_change",
            entity: "company",
            entityId: id,
            before: {
                slug: existing.slug
            },
            after: {
                slug: updated.slug
            },
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent
        });
    }
    return getAdminCompany(id);
}
async function transitionCompany(id, action, actor) {
    const existing = await prisma.company.findUnique({
        where: {
            id
        }
    });
    if (!existing) throw new ApiError(404, "Company not found.");
    const nextStatus = (0, nextCompanyStatus)(existing.status, action);
    if (!nextStatus) {
        throw new ApiError(409, `Cannot ${action} a company that is ${existing.status.toLowerCase()}.`);
    }
    const now = new Date();
    const data = {
        status: nextStatus,
        isPublic: false
    };
    if (action === "suspend") data.suspendedAt = now;
    if (action === "activate" || action === "reactivate") data.suspendedAt = null;
    if (action === "archive") data.archivedAt = now;
    const result = await prisma.company.updateMany({
        where: {
            id,
            status: existing.status
        },
        data
    });
    if (result.count === 0) {
        throw new ApiError(409, "The company status changed. Refresh and try again.");
    }
    await (0, recordAudit)({
        actorId: actor.id,
        companyId: id,
        action: `company.${action}`,
        entity: "company",
        entityId: id,
        before: {
            status: existing.status,
            isPublic: existing.isPublic
        },
        after: {
            status: nextStatus,
            isPublic: false
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent
    });
    const companyOwners = await prisma.companyMembership.findMany({
      where: { companyId: id, status: "ACTIVE", role: { in: ["OWNER", "MANAGER"] } },
      select: { userId: true },
    });
    await Promise.all(
      [...new Set(companyOwners.map((membership) => membership.userId))].map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            title: `Company ${action}`,
            body: `Company ${id} is now ${nextStatus.toLowerCase()}.`,
            url: "/company/select/",
            tag: `company-lifecycle-${id}-${nextStatus}`,
          },
        }).catch(() => undefined),
      ),
    );
    return getAdminCompany(id);
}
async function assignCompanyMembership(companyId, input, actor) {
    const company = await prisma.company.findUnique({
        where: {
            id: companyId
        },
        select: {
            id: true,
            status: true,
            name: true,
            slug: true
        }
    });
    if (!company) throw new ApiError(404, "Company not found.");
    if (company.status === "ARCHIVED") {
        throw new ApiError(409, "Archived companies cannot receive new members.");
    }
    const user = await prisma.user.findFirst({
        where: {
            id: input.user_id,
            isActive: true,
            deletedAt: null
        },
        select: {
            id: true,
            username: true,
            email: true
        }
    });
    if (!user) throw new ApiError(400, "Select an active user account.");
    const existing = await prisma.companyMembership.findFirst({
        where: {
            companyId,
            userId: input.user_id,
            status: {
                in: [
                    "ACTIVE",
                    "INVITED"
                ]
            }
        },
        orderBy: {
            createdAt: "desc"
        }
    });
    let membership;
    let action;
    let before = null;
    if (existing) {
        if (existing.status === "ACTIVE" && existing.role === input.role) {
            return prisma.companyMembership.findUniqueOrThrow({
                where: {
                    id: existing.id
                },
                include: {
                    user: {
                        include: {
                            profile: true
                        }
                    },
                    assignedBy: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                }
            });
        }
        before = {
            status: existing.status,
            role: existing.role
        };
        membership = await prisma.companyMembership.update({
            where: {
                id: existing.id
            },
            data: {
                role: input.role,
                status: "ACTIVE",
                revokedAt: null,
                assignedByUserId: actor.id
            },
            include: {
                user: {
                    include: {
                        profile: true
                    }
                },
                assignedBy: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });
        action = existing.status === "ACTIVE" ? "company.membership.role_change" : "company.membership.assign";
    } else {
        try {
            membership = await prisma.companyMembership.create({
                data: {
                    companyId,
                    userId: input.user_id,
                    role: input.role,
                    status: "ACTIVE",
                    assignedByUserId: actor.id
                },
                include: {
                    user: {
                        include: {
                            profile: true
                        }
                    },
                    assignedBy: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                }
            });
            action = "company.membership.assign";
        } catch (error) {
            if (isUniqueConstraintError(error)) {
                throw new ApiError(409, "This user already has an active membership.");
            }
            throw error;
        }
    }
    await (0, recordAudit)({
        actorId: actor.id,
        companyId,
        action,
        entity: "company_membership",
        entityId: membership.id,
        before,
        after: {
            membershipId: membership.id,
            userId: membership.userId,
            role: membership.role,
            status: membership.status
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent
    });
    await prisma.notification.create({
      data: {
        userId: membership.userId,
        title: "Company membership updated",
        body: `Your membership for company ${companyId} is now ${membership.role}.`,
        url: "/company/select/",
        tag: `company-membership-${membership.id}`,
      },
    }).catch(() => undefined);
    return membership;
}
async function updateCompanyMembershipRole(companyId, membershipId, role, actor) {
    const membership = await prisma.companyMembership.findFirst({
        where: {
            id: membershipId,
            companyId
        },
        include: {
            user: {
                include: {
                    profile: true
                }
            },
            assignedBy: {
                select: {
                    id: true,
                    username: true
                }
            }
        }
    });
    if (!membership) throw new ApiError(404, "Membership not found.");
    if (membership.status !== "ACTIVE") {
        throw new ApiError(409, "Only active memberships can change role.");
    }
    if (membership.role === role) return membership;
    const updated = await prisma.companyMembership.update({
        where: {
            id: membership.id
        },
        data: {
            role,
            assignedByUserId: actor.id
        },
        include: {
            user: {
                include: {
                    profile: true
                }
            },
            assignedBy: {
                select: {
                    id: true,
                    username: true
                }
            }
        }
    });
    await (0, recordAudit)({
        actorId: actor.id,
        companyId,
        action: "company.membership.role_change",
        entity: "company_membership",
        entityId: updated.id,
        before: {
            role: membership.role
        },
        after: {
            role: updated.role
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent
    });
    return updated;
}
async function revokeCompanyMembership(companyId, membershipId, actor) {
    const membership = await prisma.companyMembership.findFirst({
        where: {
            id: membershipId,
            companyId
        },
        include: {
            user: {
                include: {
                    profile: true
                }
            },
            assignedBy: {
                select: {
                    id: true,
                    username: true
                }
            }
        }
    });
    if (!membership) throw new ApiError(404, "Membership not found.");
    if (membership.status === "REVOKED") return membership;
    const revoked = await prisma.companyMembership.update({
        where: {
            id: membership.id
        },
        data: {
            status: "REVOKED",
            revokedAt: new Date(),
            assignedByUserId: actor.id
        },
        include: {
            user: {
                include: {
                    profile: true
                }
            },
            assignedBy: {
                select: {
                    id: true,
                    username: true
                }
            }
        }
    });
    await (0, recordAudit)({
        actorId: actor.id,
        companyId,
        action: "company.membership.revoke",
        entity: "company_membership",
        entityId: revoked.id,
        before: {
            status: membership.status,
            role: membership.role
        },
        after: {
            status: revoked.status,
            role: revoked.role
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent
    });
    await prisma.notification.create({
      data: {
        userId: revoked.userId,
        title: "Company membership revoked",
        body: `Your membership for company ${companyId} has been revoked.`,
        url: "/dashboard/",
        tag: `company-membership-${revoked.id}`,
      },
    }).catch(() => undefined);
    return revoked;
}


export {
  listAdminCompanies,
  getAdminCompany,
  createAdminCompany,
  updateAdminCompany,
  transitionCompany,
  assignCompanyMembership,
  updateCompanyMembershipRole,
  revokeCompanyMembership,
};


// @ts-nocheck
import "server-only";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/http";
import { recordAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
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
    account: { select: { id: true, username: true, email: true } },
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
const COMPANY_DETAIL_INCLUDE = COMPANY_LIST_INCLUDE;
function isUniqueConstraintError(error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
function uniqueConstraintTarget(error) {
    const target = error?.meta?.target;
    return Array.isArray(target) ? target.join(",").toLowerCase() : typeof target === "string" ? target.toLowerCase() : "";
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
        openingHours:
            input.opening_hours === null || input.opening_hours === undefined
                ? Prisma.DbNull
                : input.opening_hours
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
    if (input.opening_hours !== undefined) {
        data.openingHours =
            input.opening_hours === null ? Prisma.DbNull : input.opening_hours;
    }
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

async function listAdminCompanies(filters: any = {}, pagination: any = null) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.region) where.region = { contains: filters.region, mode: "insensitive" };
    if (filters.search) {
        where.OR = [
            { name: { contains: filters.search, mode: "insensitive" } },
            { slug: { contains: filters.search, mode: "insensitive" } },
            { contactEmail: { contains: filters.search, mode: "insensitive" } },
            { region: { contains: filters.search, mode: "insensitive" } }
        ];
    }
    const [companies, total] = await Promise.all([
        prisma.company.findMany({
            where,
            include: COMPANY_LIST_INCLUDE,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: pagination?.skip ?? 0,
            take: pagination?.take ?? 100
        }),
        prisma.company.count({ where })
    ]);
    return { companies, total };
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
async function createAdminCompany(input, actor, images = {}, ownerInput) {
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
    let ownerData = null;
    if (ownerInput) {
        const username = ownerInput.username.trim();
        const email = ownerInput.email.trim().toLowerCase();
        const [existingUsername, existingEmail] = await Promise.all([
            prisma.user.findUnique({
                where: {
                    username
                },
                select: {
                    id: true
                }
            }),
            prisma.user.findFirst({
                where: {
                    email
                },
                select: {
                    id: true
                }
            })
        ]);
        if (existingUsername) {
            throw new ApiError(400, "A user with that username already exists.", {
                owner_username: [
                    "A user with that username already exists."
                ]
            });
        }
        if (existingEmail) {
            throw new ApiError(400, "A user with that email already exists.", {
                owner_email: [
                    "A user with that email already exists."
                ]
            });
        }
        ownerData = {
            username,
            email,
            password: await hashPassword(ownerInput.password)
        };
    }
    let company = null;
    for(let attempt = 1; attempt <= 20; attempt += 1){
        const slug = (0, companySlugCandidate)(baseSlug, attempt);
        try {
            company = await prisma.company.create({
                include: { account: { select: { id: true, username: true, email: true } } },
                data: {
                    ...createData(input, slug),
                    status: "PENDING",
                    isPublic: false,
                    logoImageKey: images.logoImageKey ?? null,
                    coverImageKey: images.coverImageKey ?? null,
                    ...ownerData ? {
                        createdBy: {
                            connect: {
                                id: actor.id
                            }
                        },
                        account: {
                            create: {
                                ...ownerData,
                                accountType: "PRIVATE_HIRE_COMPANY",
                                profile: { create: {} }
                            }
                        }
                    } : {
                        createdByUserId: actor.id
                    }
                },

            });
            break;
        } catch (error) {
            if (!isUniqueConstraintError(error)) throw error;
            if (ownerData) {
                const target = uniqueConstraintTarget(error);
                if (target.includes("username")) {
                    throw new ApiError(400, "A user with that username already exists.", {
                        owner_username: [
                            "A user with that username already exists."
                        ]
                    });
                }
                if (target.includes("email")) {
                    throw new ApiError(400, "A user with that email already exists.", {
                        owner_email: [
                            "A user with that email already exists."
                        ]
                    });
                }
                if (!target.includes("slug")) throw error;
            }
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
    return company;
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
        isPublic: action === "activate"
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
            isPublic: data.isPublic
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent
    });
    const companyAccount = await prisma.company.findUnique({
      where: { id }, select: { account: { select: { id: true } } },
    });
    if (companyAccount?.account?.id) {
      await prisma.notification.create({
        data: {
          userId: companyAccount.account.id,
          title: `Company ${action}`,
          body: `Company ${id} is now ${nextStatus.toLowerCase()}.`,
          url: "/company/dashboard/",
          tag: `company-lifecycle-${id}-${nextStatus}`,
        },
      }).catch(() => undefined);
    }
    return getAdminCompany(id);
}
export {
  listAdminCompanies,
  getAdminCompany,
  createAdminCompany,
  updateAdminCompany,
  transitionCompany,
};

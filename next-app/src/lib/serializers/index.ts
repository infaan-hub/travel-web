import type {
  Attraction,
  AuditLog,
  Booking,
  Company,
  CompanyMembership,
  CompanyMembershipStatus,
  CompanyRole,
  ContactMessage,
  HomeSetting,
  Hotel,
  ItineraryItem,
  Notification,
  Profile,
  Review,
  Room,
  Tour,
  TourGalleryImage,
  TravelDriver,
  TravelTip,
  TravelVehicle,
  User,
  VisitorTracking,
  Workspace,
  WorkspaceTask,
} from "@prisma/client";
import { publicImageUrl } from "@/lib/storage/images";
import { publicCompanyPath } from "@/lib/company-domain";
import { companyBookingTransitions } from "@/lib/company-operations";
import {
  companyRolePermissions,
  type CompanyAccessCompany,
  type CompanyAccessMembership,
  type CompanyPermission,
} from "@/lib/company-access";

export type Json = Record<string, unknown>;

const decimal = (value: { toString(): string } | null | undefined): string | null =>
  value === null || value === undefined ? null : value.toString();

const iso = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

const dateOnly = (value: Date | null | undefined): string | null =>
  value ? value.toISOString().slice(0, 10) : null;

export function userSerializer(user: User): Json {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    is_staff: user.isStaff,
    email_verified: user.emailVerified,
    date_joined: iso(user.dateJoined),
    profile_image_url: null,
  };
}

export function userSerializerWithProfile(
  user: User & { profile: Profile | null },
): Json {
  return {
    ...userSerializer(user),
    first_name: user.firstName,
    last_name: user.lastName,
    profile_image_url: publicImageUrl(user.profile?.image ?? null),
  };
}

export function profileSerializer(profile: Profile & { user: User }): Json {
  return {
    id: profile.id,
    full_name: profile.fullName,
    email: profile.user.email,
    phone: profile.phone,
    address: profile.address,
    profile_image: publicImageUrl(profile.image),
  };
}

export function galleryImageSerializer(image: TourGalleryImage): Json {
  return {
    id: image.id,
    tour: image.tourId,
    image: image.image,
    image_url: publicImageUrl(image.image),
    order: image.order,
    created_at: iso(image.createdAt),
  };
}

export function itinerarySerializer(item: ItineraryItem): Json {
  return {
    id: item.id,
    tour: item.tourId,
    day: item.day,
    title: item.title,
    description: item.description,
  };
}

export function reviewSerializer(
  review: Review & { user?: User | null; tour?: Tour | null },
): Json {
  return {
    id: review.id,
    user: review.userId,
    tour: review.tourId,
    rating: review.rating,
    content: review.content,
    status: review.status,
    created_at: iso(review.createdAt),
    updated_at: iso(review.updatedAt),
    user_name: review.user?.username ?? null,
    tour_title: review.tour?.title ?? null,
  };
}

function ratingAggregate(reviews: Review[]): { average_rating: number | null; review_count: number } {
  const approved = reviews.filter((review) => review.status === "approved");
  if (approved.length === 0) return { average_rating: null, review_count: 0 };
  const total = approved.reduce((sum, review) => sum + review.rating, 0);
  return {
    average_rating: Math.round((total / approved.length) * 100) / 100,
    review_count: approved.length,
  };
}

export function tourListSerializer(
  tour: Tour & {
    reviews?: Review[];
    galleryImages?: TourGalleryImage[];
    company?: { name: string; slug: string } | null;
  },
): Json {
  const { average_rating, review_count } = ratingAggregate(tour.reviews ?? []);
  return {
    id: tour.id,
    title: tour.title,
    short_description: tour.shortDescription,
    description: tour.description,
    price: decimal(tour.price),
    duration: tour.duration,
    destination: tour.destination,
    latitude: tour.destinationLat,
    longitude: tour.destinationLng,
    destination_lat: tour.destinationLat,
    destination_lng: tour.destinationLng,
    category: tour.category,
    image_url: publicImageUrl(tour.image),
    main_image_url: publicImageUrl(tour.image),
    image2_url: publicImageUrl(tour.image2),
    image3_url: publicImageUrl(tour.image3),
    image: tour.image,
    image2: tour.image2,
    image3: tour.image3,
    available: tour.available,
    featured: tour.featured,
    company_id: tour.companyId,
    company_name: tour.company?.name ?? null,
    company_slug: tour.company?.slug ?? null,
    company_public_path: tour.company?.slug
      ? publicCompanyPath(tour.company.slug)
      : null,
    average_rating,
    review_count,
    included_items: Array.isArray(tour.includes) ? tour.includes : [],
    excluded_items: Array.isArray(tour.excludes) ? tour.excludes : [],
    gallery_image_urls: (tour.galleryImages ?? []).map((image) =>
      publicImageUrl(image.image),
    ),
    created_at: iso(tour.createdAt),
    updated_at: iso(tour.updatedAt),
  };
}

export function tourDetailSerializer(
  tour: Tour & {
    reviews?: (Review & { user?: User | null })[];
    galleryImages?: TourGalleryImage[];
    itinerary?: ItineraryItem[];
    company?: { name: string; slug: string } | null;
  },
): Json {
  const approved = (tour.reviews ?? []).filter((review) => review.status === "approved");
  const { average_rating, review_count } = ratingAggregate(tour.reviews ?? []);
  return {
    id: tour.id,
    title: tour.title,
    description: tour.description,
    short_description: tour.shortDescription,
    price: decimal(tour.price),
    duration: tour.duration,
    destination: tour.destination,
    destination_lat: tour.destinationLat,
    destination_lng: tour.destinationLng,
    latitude: tour.destinationLat,
    longitude: tour.destinationLng,
    category: tour.category,
    image: tour.image,
    image_url: publicImageUrl(tour.image),
    main_image_url: publicImageUrl(tour.image),
    image2: tour.image2,
    image2_url: publicImageUrl(tour.image2),
    image3: tour.image3,
    image3_url: publicImageUrl(tour.image3),
    available: tour.available,
    featured: tour.featured,
    company_id: tour.companyId,
    company_name: tour.company?.name ?? null,
    company_slug: tour.company?.slug ?? null,
    company_public_path: tour.company?.slug
      ? publicCompanyPath(tour.company.slug)
      : null,
    included_items: Array.isArray(tour.includes) ? tour.includes : [],
    excluded_items: Array.isArray(tour.excludes) ? tour.excludes : [],
    gallery_images: (tour.galleryImages ?? []).map(galleryImageSerializer),
    gallery_image_urls: (tour.galleryImages ?? []).map((image) => publicImageUrl(image.image)),
    itinerary: (tour.itinerary ?? []).map(itinerarySerializer),
    reviews: approved.map((review) => reviewSerializer(review)),
    average_rating,
    review_count,
    created_at: iso(tour.createdAt),
    updated_at: iso(tour.updatedAt),
  };
}

export function attractionSerializer(attraction: Attraction): Json {
  return {
    id: attraction.id,
    name: attraction.name,
    description: attraction.description,
    location: attraction.location,
    region: attraction.region,
    category: attraction.category,
    image: attraction.image,
    image_url: publicImageUrl(attraction.image),
    best_time_to_visit: attraction.bestTimeToVisit,
    entry_fee: attraction.entryFee,
    activities: attraction.activities,
    created_at: iso(attraction.createdAt),
    updated_at: iso(attraction.updatedAt),
  };
}

export function bookingSerializer(
  booking: Booking & {
    tour?: Tour | null;
    user?: User | null;
    company?: Company | null;
  },
): Json {
  const tour = booking.tour ?? null;
  const total = tour ? Number(tour.price) * booking.travelers : null;
  return {
    id: booking.id,
    reference: booking.reference,
    user: booking.userId,
    tour: booking.tourId,
    company: booking.companyId,
    company_name: booking.companyNameSnapshot ?? booking.company?.name ?? null,
    full_name: booking.fullName,
    email: booking.email,
    phone: booking.phone,
    address: booking.address,
    travelers: booking.travelers,
    travel_date: dateOnly(booking.travelDate),
    notes: booking.notes,
    status: booking.status,
    user_lat: booking.userLat,
    user_lng: booking.userLng,
    distance_km: booking.distanceKm,
    estimated_time_mins: booking.estimatedTimeMins,
    google_maps_url: booking.googleMapsUrl,
    created_at: iso(booking.createdAt),
    tour_title: booking.tourTitleSnapshot ?? tour?.title ?? null,
    tour_price: tour ? decimal(tour.price) : null,
    tour_destination: tour?.destination ?? null,
    tour_destination_lat: tour?.destinationLat ?? null,
    tour_destination_lng: tour?.destinationLng ?? null,
    total_price: total,
    tour_image: publicImageUrl(tour?.image ?? null),
    user_name: booking.user?.username ?? null,
  };
}

type CompanyBookingAuditEntry = Pick<
  AuditLog,
  "id" | "action" | "entity" | "entityId" | "before" | "after" | "createdAt"
> & {
  actor?: Pick<User, "id" | "username"> | null;
};

/** Minimal booking fields for the operational company list. */
export function companyBookingListSerializer(
  booking: Booking & { tour?: Tour | null },
): Json {
  return {
    id: booking.id,
    reference: booking.reference,
    company: booking.companyId,
    full_name: booking.fullName,
    email: booking.email,
    phone: booking.phone,
    travelers: booking.travelers,
    travel_date: dateOnly(booking.travelDate),
    status: booking.status,
    tour: booking.tourId,
    tour_title: booking.tourTitleSnapshot ?? booking.tour?.title ?? null,
    tour_destination: booking.tour?.destination ?? null,
    total_price: booking.tour
      ? Number(booking.tour.price) * booking.travelers
      : null,
    created_at: iso(booking.createdAt),
  };
}

export function companyBookingHistorySerializer(
  entry: CompanyBookingAuditEntry,
): Json {
  return {
    id: entry.id,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    actor: entry.actor
      ? { id: entry.actor.id, username: entry.actor.username }
      : null,
    before: entry.before,
    after: entry.after,
    created_at: iso(entry.createdAt),
  };
}

/**
 * Operational company booking detail. Contact and travel data are included
 * because the company needs them to deliver the booking; platform-wide
 * customer exports are deliberately not part of this serializer.
 */
export function companyBookingDetailSerializer(
  booking: Booking & {
    tour?: Tour | null;
    user?: User | null;
    company?: Company | null;
  },
  history: CompanyBookingAuditEntry[] = [],
): Json {
  return {
    ...bookingSerializer(booking),
    allowed_transitions: companyBookingTransitions(booking.status),
    status_history: history.map(companyBookingHistorySerializer),
  };
}

export function companyNotificationSerializer(notification: Notification): Json {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    url: notification.url,
    tag: notification.tag,
    read: notification.read,
    created_at: iso(notification.createdAt),
  };
}

export function contactSerializer(message: ContactMessage): Json {
  return {
    id: message.id,
    name: message.name,
    email: message.email,
    phone: message.phone,
    subject: message.subject,
    message: message.message,
    is_read: message.isRead,
    created_at: iso(message.createdAt),
  };
}

export function tipSerializer(tip: TravelTip & { author?: User | null }): Json {
  return {
    id: tip.id,
    title: tip.title,
    content: tip.content,
    category: tip.category,
    image: tip.image,
    image_url: publicImageUrl(tip.image),
    author: tip.authorId,
    author_name: tip.author?.username ?? null,
    published: tip.published,
    created_at: iso(tip.createdAt),
    updated_at: iso(tip.updatedAt),
  };
}

export function homeSettingSerializer(setting: HomeSetting): Json {
  return {
    id: setting.id,
    hero_image: setting.heroImage,
    zanzibar_image: setting.zanzibarImage,
    tanzania_image: setting.tanzaniaImage,
    hero_image_url: publicImageUrl(setting.heroImage),
    zanzibar_image_url: publicImageUrl(setting.zanzibarImage),
    tanzania_image_url: publicImageUrl(setting.tanzaniaImage),
    updated_at: iso(setting.updatedAt),
  };
}

export function driverSerializer(driver: TravelDriver): Json {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    image: driver.image,
    image_url: publicImageUrl(driver.image),
    created_at: iso(driver.createdAt),
  };
}

export function vehicleSerializer(vehicle: TravelVehicle): Json {
  return {
    id: vehicle.id,
    car_name: vehicle.carName,
    plate_number: vehicle.plateNumber,
    created_at: iso(vehicle.createdAt),
  };
}

export function roomSerializer(room: Room): Json {
  return {
    id: room.id,
    hotel: room.hotelId,
    name: room.name,
    price: decimal(room.price),
    description: room.description,
    created_at: iso(room.createdAt),
  };
}

export function hotelSerializer(hotel: Hotel & { rooms?: Room[] }): Json {
  return {
    id: hotel.id,
    name: hotel.name,
    location: hotel.location,
    phone: hotel.phone,
    image: hotel.image,
    image_url: publicImageUrl(hotel.image),
    rooms: (hotel.rooms ?? []).map(roomSerializer),
    created_at: iso(hotel.createdAt),
    updated_at: iso(hotel.updatedAt),
  };
}

export function workspaceTaskSerializer(task: WorkspaceTask): Json {
  return {
    id: task.id,
    workspace: task.workspaceId,
    day: task.day,
    title: task.title,
    description: task.description,
    completed: task.completed,
    created_at: iso(task.createdAt),
  };
}

export type WorkspaceWithRelations = Workspace & {
  tourist?: User | null;
  selectedHotel?: Hotel | null;
  selectedTravelDriver?: TravelDriver | null;
  selectedTravelVehicle?: TravelVehicle | null;
  selectedTours?: Tour[];
  selectedRooms?: Room[];
  tasks?: WorkspaceTask[];
};

export function workspaceSerializer(workspace: WorkspaceWithRelations): Json {
  const tourist = workspace.tourist ?? null;
  const hotel = workspace.selectedHotel ?? null;
  const driver = workspace.selectedTravelDriver ?? null;
  const vehicle = workspace.selectedTravelVehicle ?? null;
  return {
    id: workspace.id,
    tourist: workspace.touristId,
    tourist_name: workspace.touristName,
    tourist_email: workspace.touristEmail,
    selected_tours: (workspace.selectedTours ?? []).map((tour) => tour.id),
    selected_hotel: workspace.selectedHotelId,
    selected_rooms: (workspace.selectedRooms ?? []).map((room) => room.id),
    selected_travel_driver: workspace.selectedTravelDriverId,
    selected_travel_vehicle: workspace.selectedTravelVehicleId,
    total_price: decimal(workspace.totalPrice),
    notes: workspace.notes,
    status: workspace.status,
    message_sent: workspace.messageSent,
    created_at: iso(workspace.createdAt),
    updated_at: iso(workspace.updatedAt),
    tourist_name_display: workspace.touristName || tourist?.username || "",
    tourist_email_display: workspace.touristEmail || tourist?.email || "",
    hotel_name: hotel?.name ?? null,
    driver_name: driver?.name ?? null,
    vehicle_name: vehicle ? `${vehicle.carName} (${vehicle.plateNumber})` : null,
    selected_tours_details: (workspace.selectedTours ?? []).map((tour) => tourListSerializer(tour)),
    selected_rooms_details: (workspace.selectedRooms ?? []).map(roomSerializer),
    tasks: (workspace.tasks ?? []).map(workspaceTaskSerializer),
  };
}

export function visitSerializer(visit: VisitorTracking): Json {
  return {
    id: visit.id,
    session_id: visit.sessionId,
    page_url: visit.pageUrl,
    user: visit.userId,
    ip_address: visit.ipAddress,
    user_agent: visit.userAgent,
    is_authenticated: visit.isAuthenticated,
    tour_id: visit.tourId,
    created_at: iso(visit.createdAt),
  };
}

type MembershipWithUser = CompanyMembership & {
  user: User & { profile: Profile | null };
  assignedBy?: { id: number; username: string } | null;
};

export function companyMembershipSerializer(membership: MembershipWithUser): Json {
  return {
    id: membership.id,
    company: membership.companyId,
    user: {
      id: membership.user.id,
      username: membership.user.username,
      email: membership.user.email,
      full_name: membership.user.profile?.fullName || membership.user.username,
      profile_image_url: publicImageUrl(membership.user.profile?.image ?? null),
    },
    role: membership.role,
    status: membership.status,
    assigned_by: membership.assignedBy
      ? { id: membership.assignedBy.id, username: membership.assignedBy.username }
      : null,
    created_at: iso(membership.createdAt),
    updated_at: iso(membership.updatedAt),
    revoked_at: iso(membership.revokedAt),
  };
}

export function adminCompanyListSerializer(company: any): Json {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    description: company.description,
    registration_reference: company.registrationReference,
    business_type: company.businessType,
    logo_image_key: company.logoImageKey,
    logo_image_url: publicImageUrl(company.logoImageKey),
    cover_image_key: company.coverImageKey,
    cover_image_url: publicImageUrl(company.coverImageKey),
    contact_email: company.contactEmail,
    contact_phone: company.contactPhone,
    alternative_phone: company.alternativePhone,
    whatsapp_number: company.whatsappNumber,
    address: company.address,
    locality: company.locality,
    district: company.district,
    region: company.region,
    country: company.country,
    latitude: company.latitude,
    longitude: company.longitude,
    website: company.website,
    social_links: company.socialLinks,
    opening_hours: company.openingHours,
    status: company.status,
    is_public: company.isPublic,
    public_path: publicCompanyPath(company.slug),
    created_by: company.createdBy
      ? { id: company.createdBy.id, username: company.createdBy.username }
      : null,
    members_count: company.memberships?.length ?? 0,
    tours_count: company._count?.tours ?? 0,
    bookings_count: company._count?.bookings ?? 0,
    created_at: iso(company.createdAt),
    updated_at: iso(company.updatedAt),
    suspended_at: iso(company.suspendedAt),
    archived_at: iso(company.archivedAt),
  };
}

export function adminCompanyDetailSerializer(data: any): Json {
  return {
    ...adminCompanyListSerializer(data.company),
    members_count: data.stats.members_active,
    members: data.company.memberships.map(companyMembershipSerializer),
    tours: data.tours.map((tour: any) => ({
      id: tour.id,
      title: tour.title,
      price: decimal(tour.price),
      duration: tour.duration,
      destination: tour.destination,
      publication_status: tour.publicationStatus,
      available: tour.available,
      bookings_count: tour._count.bookings,
      updated_at: iso(tour.updatedAt),
    })),
    bookings: data.bookings.map((booking: any) => ({
      id: booking.id,
      reference: booking.reference,
      full_name: booking.fullName,
      travelers: booking.travelers,
      travel_date: dateOnly(booking.travelDate),
      status: booking.status,
      tour_title: booking.tourTitleSnapshot,
      created_at: iso(booking.createdAt),
    })),
    stats: data.stats,
    recent_audit: data.auditLogs.map((log: any) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entity_id: log.entityId,
      actor: log.actor ? { id: log.actor.id, username: log.actor.username } : null,
      before: log.before,
      after: log.after,
      created_at: iso(log.createdAt),
    })),
    public_path: data.publicPath,
  };
}

/**
 * Navigation-sized company memberships for `/api/user/`. Never include other
 * members, private contact data, or platform fields here.
 */
export function userCompanyNavigationSerializer(
  memberships: readonly CompanyAccessMembership[],
  activeCompanyId: number | null,
): Json {
  return {
    companies: memberships.map((membership) => ({
      id: membership.company.id,
      name: membership.company.name,
      slug: membership.company.slug,
      role: membership.role,
      permissions: companyRolePermissions(membership.role),
    })),
    active_company_id: activeCompanyId,
  };
}

export function companyWorkspaceContextSerializer(context: {
  user: { id: number; username: string };
  company: CompanyAccessCompany;
  membership: {
    id: number;
    role: CompanyRole;
    status: CompanyMembershipStatus;
  };
  role: CompanyRole;
  permissions: readonly CompanyPermission[];
}): Json {
  return {
    user: {
      id: context.user.id,
      username: context.user.username,
    },
    company: {
      id: context.company.id,
      name: context.company.name,
      slug: context.company.slug,
      description: context.company.description,
      business_type: context.company.businessType,
      status: context.company.status,
      is_public: context.company.isPublic,
      logo_image_url: publicImageUrl(context.company.logoImageKey),
      cover_image_url: publicImageUrl(context.company.coverImageKey),
      locality: context.company.locality,
      district: context.company.district,
      region: context.company.region,
      country: context.company.country,
      public_path: publicCompanyPath(context.company.slug),
    },
    membership: {
      id: context.membership.id,
      role: context.membership.role,
      status: context.membership.status,
    },
    role: context.role,
    permissions: context.permissions,
  };
}

export function companyWorkspaceProfileSerializer(company: Company): Json {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    description: company.description,
    registration_reference: company.registrationReference,
    business_type: company.businessType,
    logo_image_key: company.logoImageKey,
    logo_image_url: publicImageUrl(company.logoImageKey),
    cover_image_key: company.coverImageKey,
    cover_image_url: publicImageUrl(company.coverImageKey),
    contact_email: company.contactEmail,
    contact_phone: company.contactPhone,
    alternative_phone: company.alternativePhone,
    whatsapp_number: company.whatsappNumber,
    address: company.address,
    locality: company.locality,
    district: company.district,
    region: company.region,
    country: company.country,
    latitude: company.latitude,
    longitude: company.longitude,
    website: company.website,
    social_links: company.socialLinks,
    opening_hours: company.openingHours,
    status: company.status,
    is_public: company.isPublic,
    public_path: publicCompanyPath(company.slug),
    created_at: iso(company.createdAt),
    updated_at: iso(company.updatedAt),
    suspended_at: iso(company.suspendedAt),
    archived_at: iso(company.archivedAt),
  };
}

export function companyPublicSerializer(
  company: Company & { _count?: { tours: number } },
): Json {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    description: company.description,
    business_type: company.businessType,
    logo_image_url: publicImageUrl(company.logoImageKey),
    cover_image_url: publicImageUrl(company.coverImageKey),
    address: company.address,
    locality: company.locality,
    district: company.district,
    region: company.region,
    country: company.country,
    latitude: company.latitude,
    longitude: company.longitude,
    website: company.website,
    social_links: company.socialLinks,
    contact_email: company.contactEmail,
    contact_phone: company.contactPhone,
    public_path: publicCompanyPath(company.slug),
    map_url:
      company.latitude !== null && company.longitude !== null
        ? `https://www.openstreetmap.org/?mlat=${company.latitude}&mlon=${company.longitude}#map=15/${company.latitude}/${company.longitude}`
        : null,
    tours_count: company._count?.tours ?? 0,
  };
}

export function companyPublicDetailSerializer(
  company: Company & {
    tours?: (Tour & {
      reviews?: Review[];
      galleryImages?: TourGalleryImage[];
      company?: { name: string; slug: string } | null;
    })[];
  },
  summary: { averageRating: number | null; reviewCount: number },
): Json {
  return {
    ...companyPublicSerializer(company),
    tours_count: company.tours?.length ?? 0,
    social_links: company.socialLinks,
    opening_hours: company.openingHours,
    average_rating: summary.averageRating,
    review_count: summary.reviewCount,
    tours: (company.tours ?? []).map((tour) => ({
      ...tourListSerializer(tour),
      company_id: tour.companyId,
      publication_status: tour.publicationStatus,
      available: tour.available,
    })),
  };
}

export function companyTourSerializer(
  tour: Tour & {
    reviews?: Review[];
    galleryImages?: TourGalleryImage[];
    company?: { name: string; slug: string } | null;
    _count?: { bookings: number };
  },
): Json {
  return {
    ...tourListSerializer(tour),
    company_id: tour.companyId,
    publication_status: tour.publicationStatus,
    published_at: iso(tour.publishedAt),
    max_travelers: tour.maxTravelers,
    bookings_count: tour._count?.bookings ?? null,
  };
}

export function companyTourDetailSerializer(
  tour: Tour & {
    reviews?: (Review & { user?: User | null })[];
    galleryImages?: TourGalleryImage[];
    itinerary?: ItineraryItem[];
    company?: { name: string; slug: string } | null;
    _count?: { bookings: number };
  },
): Json {
  return {
    ...tourDetailSerializer(tour),
    company_id: tour.companyId,
    publication_status: tour.publicationStatus,
    published_at: iso(tour.publishedAt),
    max_travelers: tour.maxTravelers,
    moderation_note: tour.moderationNote,
    bookings_count: tour._count?.bookings ?? null,
  };
}

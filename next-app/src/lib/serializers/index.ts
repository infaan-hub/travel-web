import type {
  Attraction,
  Booking,
  ContactMessage,
  HomeSetting,
  Hotel,
  ItineraryItem,
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
  tour: Tour & { reviews?: Review[]; galleryImages?: TourGalleryImage[] },
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
  booking: Booking & { tour?: Tour | null; user?: User | null },
): Json {
  const tour = booking.tour ?? null;
  const total = tour ? Number(tour.price) * booking.travelers : null;
  return {
    id: booking.id,
    user: booking.userId,
    tour: booking.tourId,
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
    tour_title: tour?.title ?? null,
    tour_price: tour ? decimal(tour.price) : null,
    tour_destination: tour?.destination ?? null,
    tour_destination_lat: tour?.destinationLat ?? null,
    tour_destination_lng: tour?.destinationLng ?? null,
    total_price: total,
    tour_image: publicImageUrl(tour?.image ?? null),
    user_name: booking.user?.username ?? null,
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

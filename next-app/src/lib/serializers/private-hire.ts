import { publicImageUrl } from "@/lib/storage/images";
import type {
  PrivateHireVehicle,
  PrivateHireDriver,
  PrivateHireService,
  Company,
  Profile,
  TransportBooking,
  TransportTripRequest,
  User,
} from "@prisma/client";
import { resolveDriverStage } from "@/lib/driver-workflow";
import {
  canRescheduleBooking,
  getRescheduleDeadline,
  resolveEffectiveBookingStatus,
} from "@/lib/booking-lifecycle";
import { usdToTzs } from "@/lib/zanzibar-route-pricing";

export type PrivateHireVehicleSerializable = Omit<
  PrivateHireVehicle,
  "oneWayPriceUsd" | "waitReturnPriceUsd" | "fullDayPriceUsd"
> &
  Partial<Pick<PrivateHireVehicle, "oneWayPriceUsd" | "waitReturnPriceUsd" | "fullDayPriceUsd">>;

export function privateHireVehicleSerializer(vehicle: PrivateHireVehicleSerializable) {
  let includes: string[] = [];
  let excludes: string[] = [];

  if (Array.isArray(vehicle.includes)) {
    includes = vehicle.includes.map(String);
  } else if (typeof vehicle.includes === "string") {
    try {
      const parsed = JSON.parse(vehicle.includes);
      if (Array.isArray(parsed)) includes = parsed.map(String);
    } catch {
      includes = [];
    }
  }

  if (Array.isArray(vehicle.excludes)) {
    excludes = vehicle.excludes.map(String);
  } else if (typeof vehicle.excludes === "string") {
    try {
      const parsed = JSON.parse(vehicle.excludes);
      if (Array.isArray(parsed)) excludes = parsed.map(String);
    } catch {
      excludes = [];
    }
  }

  const oneWayUsd =
    vehicle.oneWayPriceUsd != null ? Number(vehicle.oneWayPriceUsd) : null;
  const waitReturnUsd =
    vehicle.waitReturnPriceUsd != null ? Number(vehicle.waitReturnPriceUsd) : null;
  const fullDayUsd =
    vehicle.fullDayPriceUsd != null ? Number(vehicle.fullDayPriceUsd) : null;

  return {
    id: vehicle.id,
    company_id: vehicle.companyId,
    driver_id: vehicle.driverId ?? null,
    name: vehicle.name,
    plate_number: vehicle.plateNumber,
    category: vehicle.category,
    capacity: vehicle.capacity,
    luggage_capacity: vehicle.luggageCapacity,
    description: vehicle.description,
    includes,
    excludes,
    one_way_price_usd: oneWayUsd,
    wait_return_price_usd: waitReturnUsd,
    full_day_price_usd: fullDayUsd,
    one_way_price_tzs: oneWayUsd != null ? usdToTzs(oneWayUsd) : null,
    wait_return_price_tzs: waitReturnUsd != null ? usdToTzs(waitReturnUsd) : null,
    full_day_price_tzs: fullDayUsd != null ? usdToTzs(fullDayUsd) : null,
    front_image: vehicle.frontImage,
    front_image_url: publicImageUrl(vehicle.frontImage),
    side_image: vehicle.sideImage,
    side_image_url: publicImageUrl(vehicle.sideImage),
    back_image: vehicle.backImage,
    back_image_url: publicImageUrl(vehicle.backImage),
    is_available: vehicle.isAvailable,
    created_at: vehicle.createdAt.toISOString(),
    updated_at: vehicle.updatedAt.toISOString(),
  };
}

export function privateHireDriverSerializer(
  driver: PrivateHireDriver & { user?: Pick<User, "username"> | null },
) {
  return {
    id: driver.id,
    company_id: driver.companyId,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    login_username: driver.user?.username ?? null,
    image: driver.image,
    image_url: publicImageUrl(driver.image),
    license_number: driver.licenseNumber,
    id_type: driver.idType,
    id_number: driver.idNumber,
    is_active: driver.isActive,
    created_at: driver.createdAt.toISOString(),
    updated_at: driver.updatedAt.toISOString(),
  };
}

export type SerializedPrivateHireService = ReturnType<typeof privateHireServiceSerializer>;

export function privateHireServiceSerializer(
  service: PrivateHireService & {
    vehicle?: PrivateHireVehicleSerializable;
    driver?: PrivateHireDriver;
    company?: Pick<Company, "id" | "name" | "slug" | "contactPhone" | "contactEmail" | "logoImageKey"> | null;
  },
) {
  return {
    id: service.id,
    company_id: service.companyId,
    vehicle_id: service.vehicleId,
    driver_id: service.driverId,
    title: service.title,
    description: service.description,
    price: service.price.toString(),
    pricing_type: service.pricingType,
    is_active: service.isActive,
    created_at: service.createdAt.toISOString(),
    updated_at: service.updatedAt.toISOString(),
    vehicle: service.vehicle ? privateHireVehicleSerializer(service.vehicle) : null,
    driver: service.driver ? privateHireDriverSerializer(service.driver) : null,
    company: service.company ? {
      id: service.company.id,
      name: service.company.name,
      slug: service.company.slug,
      contact_phone: service.company.contactPhone,
      contact_email: service.company.contactEmail,
      logo_image_url: publicImageUrl(service.company.logoImageKey),
    } : null,
  };
}

export function transportBookingSerializer(
  booking: Omit<TransportBooking, "tripOption"> &
    Partial<Pick<TransportBooking, "tripOption">> & {
    service?: (PrivateHireService & { vehicle?: PrivateHireVehicleSerializable; driver?: PrivateHireDriver; company?: Company | null }) | null;
    vehicle?: PrivateHireVehicleSerializable | null;
    driver?: PrivateHireDriver | null;
    company?: Company | null;
    tripRequest?: TransportTripRequest | null;
    user?: (Pick<User, "id" | "username" | "email" | "firstName" | "lastName" | "emailVerified" | "dateJoined"> & {
      profile?: Pick<Profile, "fullName" | "phone" | "address" | "image"> | null;
    }) | null;
  },
) {
  const effectiveStatus = resolveEffectiveBookingStatus({
    status: booking.status,
    travelDate: booking.travelDate,
    pickupTime: booking.pickupTime,
  });
  const effectiveStage = resolveDriverStage({
    status: effectiveStatus,
    driverStage: booking.driverStage,
  });
  const canReschedule = canRescheduleBooking({
    status: effectiveStatus,
    travelDate: booking.travelDate,
    pickupTime: booking.pickupTime,
  });
  const rescheduleDeadline = getRescheduleDeadline({
    status: effectiveStatus,
    travelDate: booking.travelDate,
    pickupTime: booking.pickupTime,
  });

  const accountFullName =
    booking.user?.profile?.fullName?.trim() ||
    [booking.user?.firstName, booking.user?.lastName].filter(Boolean).join(" ").trim() ||
    booking.fullName;

  const isUnassignedPublicPending = Boolean(
    booking.isPublic && booking.status === "pending" && !booking.driverId,
  );
  const serializedDriver =
    !isUnassignedPublicPending && booking.driver
      ? privateHireDriverSerializer(booking.driver)
      : null;
  const serializedVehicle =
    !isUnassignedPublicPending && booking.vehicle
      ? privateHireVehicleSerializer(booking.vehicle)
      : null;
  const isReassignedDriver = Boolean(
    booking.driverId && booking.service && booking.service.driverId !== booking.driverId,
  );
  const rawSerializedService = booking.service
    ? privateHireServiceSerializer(booking.service)
    : null;
  const serializedService = rawSerializedService
    ? isUnassignedPublicPending
      ? {
          ...rawSerializedService,
          driver: null,
          vehicle: null,
        }
      : isReassignedDriver
        ? {
            ...rawSerializedService,
            driver_id: booking.driverId ?? rawSerializedService.driver_id,
            vehicle_id: booking.vehicleId ?? rawSerializedService.vehicle_id,
            driver: serializedDriver,
            vehicle: serializedVehicle,
          }
        : {
            ...rawSerializedService,
            driver: serializedDriver ?? rawSerializedService.driver,
            vehicle: serializedVehicle ?? rawSerializedService.vehicle,
          }
    : null;

  return {
    id: booking.id,
    reference: booking.reference,
    user_id: booking.userId,
    service_id: booking.serviceId,
    company_id: booking.companyId,
    full_name: booking.fullName,
    email: booking.email,
    phone: booking.phone,
    passengers: booking.passengers,
    travel_date: booking.travelDate.toISOString(),
    end_date: booking.endDate?.toISOString() ?? null,
    pickup_time: booking.pickupTime,
    total_price: booking.totalPrice?.toString() ?? null,
    total_price_tzs:
      booking.totalPrice != null ? usdToTzs(Number(booking.totalPrice)) : null,
    trip_option: booking.tripOption ?? "one_way",
    status: effectiveStatus,
    can_reschedule: canReschedule,
    reschedule_deadline: rescheduleDeadline?.toISOString() ?? null,
    driver_stage: effectiveStage,
    confirmed_at: booking.confirmedAt?.toISOString() ?? null,
    started_at: booking.startedAt?.toISOString() ?? null,
    arrived_at: booking.arrivedAt?.toISOString() ?? null,
    picked_up_at: booking.pickedUpAt?.toISOString() ?? null,
    reached_dest_at: booking.reachedDestAt?.toISOString() ?? null,
    completed_at: booking.completedAt?.toISOString() ?? null,
    driver_lat: booking.driverLat ?? null,
    driver_lng: booking.driverLng ?? null,
    driver_location_updated_at: booking.driverLocationUpdatedAt?.toISOString() ?? null,
    driver_notes: booking.driverNotes ?? "",
    is_public: booking.isPublic,
    notes: booking.notes,
    origin: booking.origin ?? booking.tripRequest?.origin ?? null,
    origin_lat: booking.originLat ?? booking.tripRequest?.originLat ?? null,
    origin_lng: booking.originLng ?? booking.tripRequest?.originLng ?? null,
    destination: booking.destination ?? booking.tripRequest?.destination ?? null,
    dest_lat: booking.destLat ?? booking.tripRequest?.destLat ?? null,
    dest_lng: booking.destLng ?? booking.tripRequest?.destLng ?? null,
    distance_km: booking.distanceKm ?? booking.tripRequest?.distanceKm ?? null,
    duration_mins: booking.durationMins ?? booking.tripRequest?.durationMins ?? null,
    trip_request_id: booking.tripRequestId,
    customer_account: booking.user
      ? {
          id: booking.user.id,
          username: booking.user.username,
          full_name: accountFullName,
          first_name: booking.user.firstName,
          last_name: booking.user.lastName,
          email: booking.user.email || booking.email,
          email_verified: booking.user.emailVerified,
          phone: booking.user.profile?.phone?.trim() || booking.phone,
          address: booking.user.profile?.address?.trim() || "",
          avatar_url: publicImageUrl(booking.user.profile?.image),
          date_joined: booking.user.dateJoined.toISOString(),
        }
      : {
          id: null,
          username: null,
          full_name: booking.fullName,
          first_name: "",
          last_name: "",
          email: booking.email,
          email_verified: false,
          phone: booking.phone,
          address: "",
          avatar_url: null,
          date_joined: null,
        },
    trip: booking.tripRequest
      ? {
          id: booking.tripRequest.id,
          origin: booking.tripRequest.origin,
          origin_lat: booking.tripRequest.originLat,
          origin_lng: booking.tripRequest.originLng,
          destination: booking.tripRequest.destination,
          dest_lat: booking.tripRequest.destLat,
          dest_lng: booking.tripRequest.destLng,
          travel_date: booking.tripRequest.travelDate.toISOString(),
          pickup_time: booking.tripRequest.pickupTime,
          passengers: booking.tripRequest.passengers,
          distance_km: booking.tripRequest.distanceKm,
          duration_mins: booking.tripRequest.durationMins,
          status: booking.tripRequest.status,
          created_at: booking.tripRequest.createdAt.toISOString(),
        }
      : null,
    created_at: booking.createdAt.toISOString(),
    updated_at: booking.updatedAt.toISOString(),
    service: serializedService,
    vehicle: serializedVehicle,
    driver: serializedDriver,
    company: booking.company ? {
      id: booking.company.id,
      name: booking.company.name,
      slug: booking.company.slug,
      contact_phone: booking.company.contactPhone,
      contact_email: booking.company.contactEmail,
      logo_image_url: publicImageUrl(booking.company.logoImageKey),
    } : null,
  };
}

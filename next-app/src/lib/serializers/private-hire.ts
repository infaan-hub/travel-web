import { publicImageUrl } from "@/lib/storage/images";
import type {
  PrivateHireVehicle,
  PrivateHireDriver,
  PrivateHireService,
  Company,
  TransportBooking,
  User,
} from "@prisma/client";

export function privateHireVehicleSerializer(vehicle: PrivateHireVehicle) {
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

  return {
    id: vehicle.id,
    company_id: vehicle.companyId,
    name: vehicle.name,
    plate_number: vehicle.plateNumber,
    category: vehicle.category,
    capacity: vehicle.capacity,
    luggage_capacity: vehicle.luggageCapacity,
    description: vehicle.description,
    includes,
    excludes,
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
    vehicle?: PrivateHireVehicle;
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
  booking: TransportBooking & {
    service?: (PrivateHireService & { vehicle?: PrivateHireVehicle; driver?: PrivateHireDriver; company?: Company | null }) | null;
    vehicle?: PrivateHireVehicle | null;
    driver?: PrivateHireDriver | null;
    company?: Company | null;
  },
) {
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
    status: booking.status,
    is_public: booking.isPublic,
    notes: booking.notes,
    created_at: booking.createdAt.toISOString(),
    updated_at: booking.updatedAt.toISOString(),
    service: booking.service ? privateHireServiceSerializer(booking.service) : null,
    vehicle: booking.vehicle ? privateHireVehicleSerializer(booking.vehicle) : null,
    driver: booking.driver ? privateHireDriverSerializer(booking.driver) : null,
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

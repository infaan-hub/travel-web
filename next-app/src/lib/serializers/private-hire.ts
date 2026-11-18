import { publicImageUrl } from "@/lib/storage/images";
import type {
  PrivateHireVehicle,
  PrivateHireDriver,
  PrivateHireService,
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

export function privateHireDriverSerializer(driver: PrivateHireDriver) {
  return {
    id: driver.id,
    company_id: driver.companyId,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
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
  };
}

import "server-only";
import prisma from "@/lib/db/prisma";
import { privateHireVehicleSerializer } from "@/lib/serializers/private-hire";
import { canDriverManageVehicle, MAX_PUBLIC_DRIVER_VEHICLES } from "@/lib/driver-vehicle";

export type SerializedDriverVehicle = ReturnType<typeof privateHireVehicleSerializer>;

export type AssignedVehicleServiceSummary = {
  id: number;
  title: string;
  price: string;
  pricing_type: string;
  is_active: boolean;
};

export type AssignedDriverVehicleRecord = SerializedDriverVehicle & {
  services: AssignedVehicleServiceSummary[];
  assignment_source: "service" | "booking";
};

export type DriverVehicleCompanySummary = {
  id: number;
  name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
};

export type DriverVehiclePortalData = {
  driver: {
    id: number;
    name: string;
    phone: string;
    email: string;
    license_number: string;
    is_public: boolean;
    can_manage: boolean;
    max_vehicles: number;
    company: DriverVehicleCompanySummary | null;
  };
  can_manage: boolean;
  max_vehicles: number;
  own_vehicle: SerializedDriverVehicle | null;
  assigned_vehicles: AssignedDriverVehicleRecord[];
};

export async function loadDriverVehiclePortalData(
  driverId: number,
): Promise<DriverVehiclePortalData | null> {
  const driver = await prisma.privateHireDriver.findUnique({
    where: { id: driverId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          contactPhone: true,
          contactEmail: true,
          address: true,
        },
      },
      ownVehicle: true,
      services: {
        include: { vehicle: true },
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      },
      transportBookings: {
        where: {
          vehicleId: { not: null },
          status: { in: ["pending", "confirmed", "in_progress"] },
        },
        include: { vehicle: true },
        orderBy: [{ travelDate: "asc" }, { createdAt: "desc" }],
        take: 25,
      },
    },
  });

  if (!driver) return null;

  const canManage = canDriverManageVehicle({
    isPublic: driver.isPublic,
    companyId: driver.companyId,
  });

  const ownVehicle =
    canManage && driver.ownVehicle ? privateHireVehicleSerializer(driver.ownVehicle) : null;

  const assignedVehicles: AssignedDriverVehicleRecord[] = [];
  if (!canManage) {
    const byVehicleId = new Map<number, AssignedDriverVehicleRecord>();

    for (const service of driver.services) {
      if (!service.vehicle) continue;
      const existing = byVehicleId.get(service.vehicle.id);
      const serviceSummary: AssignedVehicleServiceSummary = {
        id: service.id,
        title: service.title,
        price: service.price.toString(),
        pricing_type: service.pricingType,
        is_active: service.isActive,
      };
      if (existing) {
        existing.services.push(serviceSummary);
      } else {
        const record: AssignedDriverVehicleRecord = {
          ...privateHireVehicleSerializer(service.vehicle),
          services: [serviceSummary],
          assignment_source: "service",
        };
        byVehicleId.set(service.vehicle.id, record);
        assignedVehicles.push(record);
      }
    }

    for (const booking of driver.transportBookings) {
      if (!booking.vehicle || byVehicleId.has(booking.vehicle.id)) continue;
      const record: AssignedDriverVehicleRecord = {
        ...privateHireVehicleSerializer(booking.vehicle),
        services: [],
        assignment_source: "booking",
      };
      byVehicleId.set(booking.vehicle.id, record);
      assignedVehicles.push(record);
    }
  }

  const company: DriverVehicleCompanySummary | null = driver.company
    ? {
        id: driver.company.id,
        name: driver.company.name,
        contact_phone: driver.company.contactPhone || "",
        contact_email: driver.company.contactEmail || "",
        address: driver.company.address || "",
      }
    : null;

  return {
    driver: {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      license_number: driver.licenseNumber,
      is_public: canManage,
      can_manage: canManage,
      max_vehicles: canManage ? MAX_PUBLIC_DRIVER_VEHICLES : 0,
      company,
    },
    can_manage: canManage,
    max_vehicles: canManage ? MAX_PUBLIC_DRIVER_VEHICLES : 0,
    own_vehicle: ownVehicle,
    assigned_vehicles: assignedVehicles,
  };
}

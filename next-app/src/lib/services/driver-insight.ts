import "server-only";
import prisma from "@/lib/db/prisma";
import {
  computeDriverMonthlyInsights,
  type DriverInsightBookingInput,
  type DriverMonthlyInsights,
} from "@/lib/driver-insight-metrics";
import type { DriverPdfProfile } from "@/lib/driver-monthly-pdf";

export type DriverVehicleOption = {
  id: number;
  name: string;
  plate_number: string;
  category: string;
  capacity: number;
  luggage_capacity: number;
  service_title: string;
};

export type DriverFullContext = {
  id: number;
  name: string;
  phone: string;
  email: string;
  license_number: string;
  is_public: boolean;
  company_name: string;
  vehicles: DriverVehicleOption[];
};

export async function getDriverFullContext(driverId: number): Promise<DriverFullContext | null> {
  const driver = await prisma.privateHireDriver.findUnique({
    where: { id: driverId },
    include: {
      company: { select: { id: true, name: true } },
      ownVehicle: true,
      services: {
        where: { isActive: true },
        include: { vehicle: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!driver) return null;

  const seenVehicles = new Set<number>();
  const vehicles: DriverVehicleOption[] = [];
  if (driver.ownVehicle) {
    seenVehicles.add(driver.ownVehicle.id);
    vehicles.push({
      id: driver.ownVehicle.id,
      name: driver.ownVehicle.name,
      plate_number: driver.ownVehicle.plateNumber,
      category: driver.ownVehicle.category,
      capacity: driver.ownVehicle.capacity,
      luggage_capacity: driver.ownVehicle.luggageCapacity,
      service_title: "Registered driver vehicle",
    });
  }
  for (const service of driver.services) {
    if (!service.vehicle || seenVehicles.has(service.vehicle.id)) continue;
    seenVehicles.add(service.vehicle.id);
    vehicles.push({
      id: service.vehicle.id,
      name: service.vehicle.name,
      plate_number: service.vehicle.plateNumber,
      category: service.vehicle.category,
      capacity: service.vehicle.capacity,
      luggage_capacity: service.vehicle.luggageCapacity,
      service_title: service.title,
    });
  }

  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    license_number: driver.licenseNumber,
    is_public: driver.isPublic && !driver.companyId,
    company_name: driver.company?.name ?? "Public Hire Driver Network",
    vehicles,
  };
}

export async function loadDriverMonthlyInsightBundle(
  driverId: number,
  month?: string | null,
): Promise<{
  driver: DriverFullContext;
  pdfProfile: DriverPdfProfile;
  insights: DriverMonthlyInsights;
} | null> {
  const [driver, bookings] = await Promise.all([
    getDriverFullContext(driverId),
    prisma.transportBooking.findMany({
      where: { driverId },
      include: {
        company: { select: { name: true } },
        service: { select: { title: true } },
        tripRequest: {
          select: {
            origin: true,
            destination: true,
            distanceKm: true,
            durationMins: true,
          },
        },
      },
      orderBy: [{ travelDate: "desc" }, { createdAt: "desc" }],
      take: 1000,
    }),
  ]);

  if (!driver) return null;

  const normalized: DriverInsightBookingInput[] = bookings.map((b) => ({
    id: b.id,
    reference: b.reference,
    fullName: b.fullName,
    travelDate: b.travelDate,
    pickupTime: b.pickupTime,
    passengers: b.passengers,
    status: b.status,
    driverStage: b.driverStage,
    origin: b.origin ?? b.tripRequest?.origin ?? null,
    destination: b.destination ?? b.tripRequest?.destination ?? null,
    distanceKm: b.distanceKm ?? b.tripRequest?.distanceKm ?? null,
    durationMins: b.durationMins ?? b.tripRequest?.durationMins ?? null,
    totalPrice: b.totalPrice ? Number(b.totalPrice) : null,
    companyName: b.company?.name ?? null,
    serviceTitle: b.service?.title ?? null,
    completedAt: b.completedAt,
    createdAt: b.createdAt,
  }));

  const insights = computeDriverMonthlyInsights(normalized, month);
  const primaryVehicle = driver.vehicles[0];
  const pdfProfile: DriverPdfProfile = {
    driverName: driver.name,
    phone: driver.phone,
    email: driver.email,
    licenseNumber: driver.license_number,
    companyName: driver.company_name,
    vehicleLabel: primaryVehicle
      ? `${primaryVehicle.name} (${primaryVehicle.plate_number})`
      : "Assigned Private Hire Vehicle",
  };

  return { driver, pdfProfile, insights };
}

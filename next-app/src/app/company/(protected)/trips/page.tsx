import type { Metadata } from "next";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import prisma from "@/lib/db/prisma";
import CompanyTripsPage, {
  type CompanyTripHubContext,
} from "@/features/pages/CompanyTripsPage";

export const metadata: Metadata = {
  title: "Company Trips — Generator & WhatsApp Dispatch",
  description:
    "Generate custom Zanzibar routes, preview live trip maps, and send trip cards directly to customers via WhatsApp.",
};

export default async function CompanyTripsRoute() {
  const { company } = await requirePageCompanyAccount({ permission: "tours:read" });

  const [drivers, vehicles] = await Promise.all([
    prisma.privateHireDriver.findMany({
      where: { companyId: company.id },
      orderBy: [{ isActive: "desc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        phone: true,
        licenseNumber: true,
        isActive: true,
      },
    }),
    prisma.privateHireVehicle.findMany({
      where: { companyId: company.id },
      orderBy: [{ isAvailable: "desc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        plateNumber: true,
        category: true,
        capacity: true,
        isAvailable: true,
      },
    }),
  ]);

  const companyContext: CompanyTripHubContext = {
    id: company.id,
    name: company.name,
    contact_phone: company.contactPhone,
    contact_email: company.contactEmail,
    drivers: drivers.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      license_number: d.licenseNumber,
      is_active: d.isActive,
    })),
    vehicles: vehicles.map((v) => ({
      id: v.id,
      name: v.name,
      plate_number: v.plateNumber,
      category: v.category,
      capacity: v.capacity,
      is_available: v.isAvailable,
    })),
  };

  return <CompanyTripsPage company={companyContext} />;
}

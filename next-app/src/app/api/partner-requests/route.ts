import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { readJson } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { DriverIdType, JoinRequestType, Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = (await readJson(request)) as Record<string, unknown>;

    const typeRaw = String(body.type || "").toUpperCase().trim();
    if (typeRaw !== "COMPANY_REGISTRATION" && typeRaw !== "PUBLIC_DRIVER_REGISTRATION") {
      throw new ApiError(400, "Invalid request type. Must be COMPANY_REGISTRATION or PUBLIC_DRIVER_REGISTRATION.");
    }

    const type =
      typeRaw === "COMPANY_REGISTRATION"
        ? JoinRequestType.COMPANY_REGISTRATION
        : JoinRequestType.PUBLIC_DRIVER_REGISTRATION;

    const fullName = String(body.full_name || body.name || "").trim();
    if (!fullName) throw new ApiError(400, "Full name is required.");

    const phone = String(body.phone || "").trim();
    if (!phone) throw new ApiError(400, "Phone number is required.");

    const email = String(body.email || "").trim();

    let companyName: string | null = null;
    let licenseNumber: string | null = null;
    let idType: DriverIdType | null = null;
    let idNumber: string | null = null;
    let formattedMessage = "";
    let subject = "";

    if (type === JoinRequestType.COMPANY_REGISTRATION) {
      companyName = String(body.company_name || "").trim();
      if (!companyName) throw new ApiError(400, "Company name is required.");

      const businessType = String(body.business_type || "Tour Transport & Car Rental");
      const registrationRef = String(body.registration_reference || "");
      const depotLocation = String(body.depot_location || "");
      const fleetSize = String(body.fleet_size || "");
      const notes = String(body.notes || body.message || "");

      subject = `[Company Registration Request] ${companyName}`;
      formattedMessage = [
        `=== COMPANY REGISTRATION REQUEST ===`,
        `Company Name: ${companyName}`,
        `Contact Person: ${fullName}`,
        `Phone: ${phone}`,
        `Email: ${email || "Not provided"}`,
        `Business Type: ${businessType}`,
        registrationRef ? `Registration / License: ${registrationRef}` : null,
        depotLocation ? `Depot / Base Location: ${depotLocation}` : null,
        fleetSize ? `Estimated Fleet Size: ${fleetSize}` : null,
        notes ? `\nAdditional Information:\n${notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    } else {
      licenseNumber = String(body.license_number || "").trim();
      if (!licenseNumber) throw new ApiError(400, "Driving license number is required.");

      const rawIdType = String(body.id_type || "ZAN_ID").toUpperCase().trim();
      if (rawIdType === "NIDA") idType = DriverIdType.NIDA;
      else if (rawIdType === "PASSPORT") idType = DriverIdType.PASSPORT;
      else idType = DriverIdType.ZAN_ID;

      idNumber = String(body.id_number || "").trim();
      if (!idNumber) throw new ApiError(400, "ID number (ZanID, NIDA or Passport) is required.");

      const experience = String(body.experience || "");
      const languages = String(body.languages || "");
      const vehicleInfo = String(body.vehicle_info || "");
      const notes = String(body.notes || body.message || "");

      subject = `[Public Hire Driver Request] ${fullName}`;
      formattedMessage = [
        `=== PUBLIC HIRE DRIVER APPLICATION ===`,
        `Applicant Name: ${fullName}`,
        `Phone: ${phone}`,
        `Email: ${email || "Not provided"}`,
        `Driving License Number: ${licenseNumber}`,
        `ID Document: ${idType} - ${idNumber}`,
        experience ? `Driving Experience: ${experience}` : null,
        languages ? `Spoken Languages: ${languages}` : null,
        vehicleInfo ? `Own Vehicle Details: ${vehicleInfo}` : null,
        notes ? `\nApplicant Message:\n${notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }

    // 1. Save to partner_join_requests
    const requestRecord = await prisma.partnerJoinRequest.create({
      data: {
        type,
        fullName,
        email,
        phone,
        companyName,
        licenseNumber,
        idType,
        idNumber,
        details: body as unknown as Prisma.InputJsonValue,
      },
    });

    // 2. Also send as message to admin inbox in contact_messages
    await prisma.contactMessage.create({
      data: {
        name: fullName,
        email: email || `${phone.replace(/\D/g, "") || "partner"}@incoming-request.local`,
        phone,
        subject,
        message: formattedMessage,
      },
    });

    return ok({
      success: true,
      id: requestRecord.id,
      message:
        type === JoinRequestType.COMPANY_REGISTRATION
          ? "Your company registration request has been submitted to the administration team. We will review your fleet details and contact you shortly."
          : "Your driver application has been submitted to the administration team. Once verified, you will be onboarded as a registered Public Hire Driver.",
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

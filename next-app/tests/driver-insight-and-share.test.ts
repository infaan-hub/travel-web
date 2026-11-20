import { describe, expect, it } from "vitest";
import {
  computeDriverMonthlyInsights,
  parseMonthParam,
  type DriverInsightBookingInput,
} from "@/lib/driver-insight-metrics";
import { buildDriverMonthlyReportPdf } from "@/lib/driver-monthly-pdf";
import {
  buildDriverTripWhatsAppMessage,
  buildGoogleMapsTripRouteUrl,
  buildWhatsAppDirectContactPickerUrl,
} from "@/lib/driver-trip-share";

describe("driver monthly insights & designed PDF report", () => {
  const sampleBookings: DriverInsightBookingInput[] = [
    {
      id: 1,
      reference: "TR-1001",
      fullName: "Amina Hassan",
      travelDate: "2026-11-03T00:00:00.000Z",
      pickupTime: "09:00",
      passengers: 3,
      status: "completed",
      driverStage: "completed",
      origin: "Abeid Amani Karume Airport, Zanzibar",
      destination: "Nungwi Beach, North Coast",
      distanceKm: 61.2,
      durationMins: 74,
      totalPrice: 140000,
      companyName: "Zanzibar Executive Fleets",
    },
    {
      id: 2,
      reference: "TR-1002",
      fullName: "David Miller",
      travelDate: "2026-11-12T00:00:00.000Z",
      pickupTime: "14:30",
      passengers: 2,
      status: "completed",
      driverStage: "completed",
      origin: "Stone Town Ferry Terminal",
      destination: "Paje Beach, South-East Coast",
      distanceKm: 50.4,
      durationMins: 62,
      totalPrice: 115000,
      companyName: "Zanzibar Executive Fleets",
    },
    {
      id: 3,
      reference: "TR-1003",
      fullName: "Sarah Ali",
      travelDate: "2026-11-18T00:00:00.000Z",
      pickupTime: "11:00",
      passengers: 4,
      status: "confirmed",
      driverStage: "confirmed",
      origin: "Stone Town",
      destination: "Nungwi Beach, North Coast",
      distanceKm: 58.0,
      durationMins: 70,
      totalPrice: 130000,
      companyName: "Zanzibar Executive Fleets",
    },
    {
      id: 4,
      reference: "TR-0999",
      fullName: "Previous Month Rider",
      travelDate: "2026-10-15T00:00:00.000Z",
      pickupTime: "08:00",
      passengers: 2,
      status: "completed",
      driverStage: "completed",
      origin: "Airport",
      destination: "Kendwa Beach",
      distanceKm: 59.0,
      durationMins: 72,
      totalPrice: 120000,
    },
  ];

  it("computes monthly KPIs, weekly series, 6-month trend, and top destinations accurately", () => {
    expect(parseMonthParam("2026-11")).toBe("2026-11");
    expect(parseMonthParam("invalid", new Date("2026-11-20T00:00:00Z"))).toBe("2026-11");

    const insights = computeDriverMonthlyInsights(
      sampleBookings,
      "2026-11",
      new Date("2026-11-20T00:00:00Z"),
    );

    expect(insights.month).toBe("2026-11");
    expect(insights.monthLabel).toBe("November 2026");
    expect(insights.kpis.totalTrips).toBe(3);
    expect(insights.kpis.completedTrips).toBe(2);
    expect(insights.kpis.confirmedTrips).toBe(1);
    expect(insights.kpis.completionRatePct).toBe(67);
    expect(insights.kpis.totalPassengers).toBe(9);
    expect(insights.kpis.totalDistanceKm).toBeCloseTo(169.6, 1);
    expect(insights.kpis.totalEarningsTzs).toBe(385000);
    expect(insights.topDestinations[0]).toMatchObject({ name: "Nungwi Beach", trips: 2 });
    expect(insights.sixMonthTrend).toHaveLength(6);
    expect(insights.sixMonthTrend[4].total).toBe(1); // Oct 2026
    expect(insights.sixMonthTrend[5].total).toBe(3); // Nov 2026
  });

  it("builds a valid multi-page binary PDF 1.4 document with monthly details", () => {
    const manyBookings: DriverInsightBookingInput[] = Array.from({ length: 28 }, (_, idx) => ({
      ...sampleBookings[0],
      id: idx + 1,
      reference: `TR-${2000 + idx}`,
      travelDate: `2026-11-${String((idx % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
    }));

    const insights = computeDriverMonthlyInsights(
      manyBookings,
      "2026-11",
      new Date("2026-11-20T00:00:00Z"),
    );

    const bytes = buildDriverMonthlyReportPdf(
      {
        driverName: "Hamisi Bakari",
        phone: "+255 777 123 456",
        email: "hamisi@example.com",
        licenseNumber: "DL-ZN-49120",
        companyName: "Zanzibar Executive Fleets",
        vehicleLabel: "Toyota Alphard (Z 441 AB)",
      },
      insights,
      new Date("2026-11-20T00:00:00Z"),
    );

    const text = Buffer.from(bytes).toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("Monthly Work Report - November 2026");
    expect(text).toContain("Hamisi Bakari");
    expect(text).toContain("Toyota Alphard");
    expect(text).toContain("Page 1 of 2");
    expect(text).toContain("Page 2 of 2");
  });
});

describe("driver WhatsApp direct trip sharing", () => {
  it("composes a complete customer WhatsApp message with driver, vehicle, and Google Maps links", () => {
    const message = buildDriverTripWhatsAppMessage({
      driverName: "Salim Rashid",
      driverPhone: "+255 777 555 222",
      driverLicense: "DL-ZN-8812",
      companyName: "Island Executive Transfers",
      vehicleName: "Toyota Alphard",
      vehiclePlate: "Z 441 AB",
      vehicleCategory: "VIP Minivan",
      vehicleSeats: 6,
      origin: { label: "Abeid Amani Karume Airport", lat: -6.218534, lng: 39.221379 },
      destination: { label: "Nungwi Beach, North Coast", lat: -5.727227, lng: 39.299202 },
      distanceKm: 61.2,
      durationMins: 74,
      scheduleText: "Tomorrow · 10:00",
      passengers: 4,
      fareEstimate: "$65",
    });

    expect(message).toContain("Salim Rashid");
    expect(message).toContain("+255 777 555 222");
    expect(message).toContain("Toyota Alphard");
    expect(message).toContain("Z 441 AB");
    expect(message).toContain("Abeid Amani Karume Airport");
    expect(message).toContain("Nungwi Beach, North Coast");
    expect(message).toContain("https://www.google.com/maps/dir/?");
    expect(message).toContain("travelmode=driving");

    const routeUrl = buildGoogleMapsTripRouteUrl(
      { label: "Airport", lat: -6.218534, lng: 39.221379 },
      { label: "Nungwi", lat: -5.727227, lng: 39.299202 },
    );
    expect(routeUrl).toContain("origin=-6.218534%2C39.221379");
    expect(routeUrl).toContain("destination=-5.727227%2C39.299202");

    // Direct contact-picker WhatsApp URL must NOT include a hardcoded recipient phone number
    const waUrl = buildWhatsAppDirectContactPickerUrl(message);
    expect(waUrl.startsWith("https://api.whatsapp.com/send?text=")).toBe(true);
    expect(waUrl).not.toContain("phone=");
  });
});

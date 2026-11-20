import { describe, expect, it } from "vitest";
import {
  MAX_PUBLIC_DRIVER_VEHICLES,
  canDriverManageVehicle,
  isPublicHireDriver,
  parseVehicleFields,
  parseVehicleStringList,
  validateDriverVehicleAction,
} from "@/lib/driver-vehicle";

describe("driver vehicle access & 1-vehicle-per-driver policy", () => {
  const publicDriver = { isPublic: true, companyId: null };
  const privateCompanyDriver = { isPublic: false, companyId: 12 };
  const companyLinkedPublicFlag = { isPublic: true, companyId: 12 };

  it("identifies public hire drivers vs company-assigned private hire drivers", () => {
    expect(isPublicHireDriver(publicDriver)).toBe(true);
    expect(canDriverManageVehicle(publicDriver)).toBe(true);

    expect(isPublicHireDriver(privateCompanyDriver)).toBe(false);
    expect(canDriverManageVehicle(privateCompanyDriver)).toBe(false);

    // Any driver attached to a company must be treated as company-managed (view only)
    expect(isPublicHireDriver(companyLinkedPublicFlag)).toBe(false);
    expect(canDriverManageVehicle(companyLinkedPublicFlag)).toBe(false);
  });

  it("enforces strictly 1 vehicle per public hire driver", () => {
    expect(MAX_PUBLIC_DRIVER_VEHICLES).toBe(1);

    // 0 vehicles -> can create, cannot update/delete
    expect(
      validateDriverVehicleAction({
        driver: publicDriver,
        existingVehicleCount: 0,
        action: "create",
      }),
    ).toEqual({ allowed: true });

    const updateEmpty = validateDriverVehicleAction({
      driver: publicDriver,
      existingVehicleCount: 0,
      action: "update",
    });
    expect(updateEmpty.allowed).toBe(false);
    if (!updateEmpty.allowed) expect(updateEmpty.status).toBe(404);

    // 1 vehicle -> cannot create a second, CAN edit and delete
    const secondCreate = validateDriverVehicleAction({
      driver: publicDriver,
      existingVehicleCount: 1,
      action: "create",
    });
    expect(secondCreate.allowed).toBe(false);
    if (!secondCreate.allowed) expect(secondCreate.status).toBe(409);

    expect(
      validateDriverVehicleAction({
        driver: publicDriver,
        existingVehicleCount: 1,
        action: "update",
      }),
    ).toEqual({ allowed: true });

    expect(
      validateDriverVehicleAction({
        driver: publicDriver,
        existingVehicleCount: 1,
        action: "delete",
      }),
    ).toEqual({ allowed: true });
  });

  it("blocks private hire company drivers from creating, editing, or deleting vehicles (403)", () => {
    for (const action of ["create", "update", "delete"] as const) {
      const res = validateDriverVehicleAction({
        driver: privateCompanyDriver,
        existingVehicleCount: action === "create" ? 0 : 1,
        action,
      });
      expect(res.allowed).toBe(false);
      if (!res.allowed) {
        expect(res.status).toBe(403);
        expect(res.message.toLowerCase()).toContain("view-only");
      }
    }
  });

  it("parses inclusions/exclusions from JSON strings, newline text, and arrays", () => {
    expect(parseVehicleStringList('["A/C", "Fuel", "a/c", ""]')).toEqual(["A/C", "Fuel"]);
    expect(parseVehicleStringList("A/C\nMineral Water\n  Fuel  ")).toEqual([
      "A/C",
      "Mineral Water",
      "Fuel",
    ]);
    expect(parseVehicleStringList(["Wi-Fi", "Wi-Fi", "Luggage"])).toEqual(["Wi-Fi", "Luggage"]);
  });

  it("validates and normalizes vehicle registration & update payloads", () => {
    const missingName = parseVehicleFields({ plate_number: "z 101 ab" });
    expect(missingName.ok).toBe(false);

    const missingPlate = parseVehicleFields({ name: "Toyota Alphard" });
    expect(missingPlate.ok).toBe(false);

    const created = parseVehicleFields({
      name: "Toyota Alphard VIP",
      plate_number: "z 441 ab",
      category: "Minivan",
      capacity: "7",
      luggage_capacity: "5",
      description: "Executive coastal transfer van",
      includes: JSON.stringify(["A/C", "Fuel"]),
      excludes: "Driver Tips\nPark Fees",
      is_available: "true",
    });

    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.data).toEqual({
        name: "Toyota Alphard VIP",
        plateNumber: "Z 441 AB",
        category: "Minivan",
        capacity: 7,
        luggageCapacity: 5,
        description: "Executive coastal transfer van",
        includes: ["A/C", "Fuel"],
        excludes: ["Driver Tips", "Park Fees"],
        isAvailable: true,
      });

      // Partial edit inherits existing values cleanly
      const edited = parseVehicleFields(
        { is_available: "false", capacity: "99" },
        created.data,
      );
      expect(edited.ok).toBe(true);
      if (edited.ok) {
        expect(edited.data.name).toBe("Toyota Alphard VIP");
        expect(edited.data.plateNumber).toBe("Z 441 AB");
        expect(edited.data.capacity).toBe(60);
        expect(edited.data.isAvailable).toBe(false);
      }
    }
  });
});

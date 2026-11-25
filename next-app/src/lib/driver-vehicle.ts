export const VEHICLE_CATEGORIES = [
  "Sedan",
  "SUV 4x4",
  "Minivan",
  "Safari Cruiser",
  "Coaster Bus",
  "Luxury VIP",
] as const;

export const MAX_PUBLIC_DRIVER_VEHICLES = 1;

export type DriverVehicleRoleInput = {
  isPublic: boolean;
  companyId: number | null;
};

/**
 * Public hire drivers operate independently (`isPublic === true && companyId === null`).
 * Private hire drivers belong to a company (`companyId !== null`) and have view-only vehicle access.
 */
export function isPublicHireDriver(driver: DriverVehicleRoleInput): boolean {
  return Boolean(driver.isPublic && driver.companyId == null);
}

export function canDriverManageVehicle(driver: DriverVehicleRoleInput): boolean {
  return isPublicHireDriver(driver);
}

export type DriverVehicleAction = "create" | "update" | "delete";

export type DriverVehicleActionDecision =
  | { allowed: true }
  | { allowed: false; status: 403 | 404 | 409; message: string };

export function validateDriverVehicleAction(params: {
  driver: DriverVehicleRoleInput;
  existingVehicleCount: number;
  action: DriverVehicleAction;
}): DriverVehicleActionDecision {
  const { driver, existingVehicleCount, action } = params;

  if (!canDriverManageVehicle(driver)) {
    return {
      allowed: false,
      status: 403,
      message:
        "Company-assigned private hire drivers have view-only access. Your company is responsible for registering, editing, and removing fleet vehicles.",
    };
  }

  if (action === "create" && existingVehicleCount >= MAX_PUBLIC_DRIVER_VEHICLES) {
    return {
      allowed: false,
      status: 409,
      message:
        "Each public hire driver can register only 1 vehicle. Edit or delete your current vehicle first.",
    };
  }

  if ((action === "update" || action === "delete") && existingVehicleCount === 0) {
    return {
      allowed: false,
      status: 404,
      message: "No registered vehicle was found for your driver account.",
    };
  }

  return { allowed: true };
}

export function parseVehicleStringList(raw: unknown): string[] {
  let items: string[] = [];
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        items = parsed.map((v) => String(v).trim()).filter(Boolean);
      } else {
        items = trimmed
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } catch {
      items = trimmed
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } else if (Array.isArray(raw)) {
    items = raw.map((v) => String(v).trim()).filter(Boolean);
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of items) {
    const clean = item.slice(0, 120);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    unique.push(clean);
    if (unique.length >= 24) break;
  }
  return unique;
}

export type ParsedVehicleFields = {
  name: string;
  plateNumber: string;
  category: string;
  capacity: number;
  luggageCapacity: number;
  description: string;
  includes: string[];
  excludes: string[];
  oneWayPriceUsd: number | null;
  waitReturnPriceUsd: number | null;
  fullDayPriceUsd: number | null;
  isAvailable: boolean;
};

export type ExistingVehicleDefaults = {
  name: string;
  plateNumber: string;
  category: string;
  capacity: number;
  luggageCapacity: number;
  description: string;
  includes: string[];
  excludes: string[];
  oneWayPriceUsd?: number | null;
  waitReturnPriceUsd?: number | null;
  fullDayPriceUsd?: number | null;
  isAvailable: boolean;
};

function parseOptionalPriceUsd(
  raw: unknown,
  fallback: number | null | undefined,
  label: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (raw === undefined) {
    return { ok: true, value: fallback ?? null };
  }
  if (raw === null) {
    return { ok: true, value: null };
  }
  const str = String(raw).trim();
  if (!str) {
    return { ok: true, value: null };
  }
  const num = Number(str);
  if (!Number.isFinite(num) || num <= 0 || num > 100000) {
    return { ok: false, message: `${label} must be a valid positive USD amount.` };
  }
  return { ok: true, value: Math.round(num * 100) / 100 };
}

export function parseVehicleFields(
  payload: Record<string, unknown>,
  existing?: ExistingVehicleDefaults,
): { ok: true; data: ParsedVehicleFields } | { ok: false; message: string } {
  const nameRaw = payload.name !== undefined ? String(payload.name).trim() : existing?.name ?? "";
  if (!nameRaw) {
    return { ok: false, message: "Vehicle name / model is required." };
  }
  if (nameRaw.length > 140) {
    return { ok: false, message: "Vehicle name / model must be 140 characters or fewer." };
  }

  const plateSource =
    payload.plate_number !== undefined
      ? payload.plate_number
      : payload.plane_number !== undefined
        ? payload.plane_number
        : existing?.plateNumber ?? "";
  const plateNumber = String(plateSource).trim().toUpperCase();
  if (!plateNumber) {
    return { ok: false, message: "Plate / registration number is required." };
  }
  if (plateNumber.length > 40) {
    return { ok: false, message: "Plate / registration number must be 40 characters or fewer." };
  }

  const categoryRaw =
    payload.category !== undefined ? String(payload.category).trim() : existing?.category ?? "Sedan";
  const category = (categoryRaw || "Sedan").slice(0, 60);

  const capacityRaw =
    payload.capacity !== undefined ? parseInt(String(payload.capacity), 10) : existing?.capacity ?? 4;
  const capacity = Number.isFinite(capacityRaw) ? Math.min(60, Math.max(1, capacityRaw)) : 4;

  const luggageRaw =
    payload.luggage_capacity !== undefined
      ? parseInt(String(payload.luggage_capacity), 10)
      : existing?.luggageCapacity ?? 2;
  const luggageCapacity = Number.isFinite(luggageRaw) ? Math.min(60, Math.max(0, luggageRaw)) : 2;

  const descriptionRaw =
    payload.description !== undefined
      ? String(payload.description).trim()
      : existing?.description ?? "";
  const description = descriptionRaw.slice(0, 1200);

  const includes =
    payload.includes !== undefined
      ? parseVehicleStringList(payload.includes)
      : existing?.includes ?? [];

  const excludes =
    payload.excludes !== undefined
      ? parseVehicleStringList(payload.excludes)
      : existing?.excludes ?? [];

  const oneWayParsed = parseOptionalPriceUsd(
    payload.one_way_price_usd,
    existing?.oneWayPriceUsd,
    "One-way price",
  );
  if (!oneWayParsed.ok) return oneWayParsed;

  const waitReturnParsed = parseOptionalPriceUsd(
    payload.wait_return_price_usd,
    existing?.waitReturnPriceUsd,
    "Wait & return price",
  );
  if (!waitReturnParsed.ok) return waitReturnParsed;

  const fullDayParsed = parseOptionalPriceUsd(
    payload.full_day_price_usd,
    existing?.fullDayPriceUsd,
    "Full day private charter price",
  );
  if (!fullDayParsed.ok) return fullDayParsed;

  const isAvailable =
    payload.is_available !== undefined
      ? payload.is_available !== false && payload.is_available !== "false" && payload.is_available !== "0"
      : existing?.isAvailable ?? true;

  return {
    ok: true,
    data: {
      name: nameRaw,
      plateNumber,
      category,
      capacity,
      luggageCapacity,
      description,
      includes,
      excludes,
      oneWayPriceUsd: oneWayParsed.value,
      waitReturnPriceUsd: waitReturnParsed.value,
      fullDayPriceUsd: fullDayParsed.value,
      isAvailable,
    },
  };
}

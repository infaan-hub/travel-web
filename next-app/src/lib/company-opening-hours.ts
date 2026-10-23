export const COMPANY_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type CompanyWeekday = (typeof COMPANY_WEEKDAYS)[number];

export type CompanyOpeningDay = {
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

export type CompanyOpeningHours = Record<CompanyWeekday, CompanyOpeningDay>;

const DAY_LABELS: Record<CompanyWeekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export function emptyCompanyOpeningHours(): CompanyOpeningHours {
  return Object.fromEntries(
    COMPANY_WEEKDAYS.map((day) => [
      day,
      { is_open: false, opens_at: null, closes_at: null },
    ]),
  ) as CompanyOpeningHours;
}

function isOpeningDay(value: unknown): value is CompanyOpeningDay {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const day = value as Record<string, unknown>;
  return (
    typeof day.is_open === "boolean" &&
    (typeof day.opens_at === "string" || day.opens_at === null) &&
    (typeof day.closes_at === "string" || day.closes_at === null)
  );
}

export function isCompanyOpeningHours(value: unknown): value is CompanyOpeningHours {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const schedule = value as Record<string, unknown>;
  return COMPANY_WEEKDAYS.every((day) => isOpeningDay(schedule[day]));
}

export function openingHoursForEditor(value: unknown): {
  schedule: CompanyOpeningHours;
  legacyText: string | null;
} {
  if (isCompanyOpeningHours(value)) {
    return { schedule: value, legacyText: null };
  }
  if (typeof value === "string" && value.trim()) {
    return {
      schedule: emptyCompanyOpeningHours(),
      legacyText: value.trim(),
    };
  }
  return { schedule: emptyCompanyOpeningHours(), legacyText: null };
}

export function openingHoursEntries(
  value: unknown,
): Array<{ day: string; hours: string }> {
  if (typeof value === "string" && value.trim()) {
    return [{ day: "Previous hours", hours: value.trim() }];
  }
  if (!isCompanyOpeningHours(value)) return [];

  return COMPANY_WEEKDAYS.map((day) => {
    const schedule = value[day];
    const hours =
      !schedule.is_open
        ? "Closed"
        : schedule.opens_at && schedule.closes_at
          ? `${schedule.opens_at}–${schedule.closes_at}`
          : "Hours not set";
    return { day: DAY_LABELS[day], hours };
  });
}

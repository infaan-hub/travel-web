import { resolveDriverStage, type DriverTripStage } from "@/lib/driver-workflow";

export type DriverInsightBookingInput = {
  id: number;
  reference: string | null;
  fullName: string;
  travelDate: Date | string;
  pickupTime: string | null;
  passengers: number;
  status: string;
  driverStage?: string | null;
  origin: string | null;
  destination: string | null;
  distanceKm: number | null;
  durationMins: number | null;
  totalPrice: number | string | null;
  companyName?: string | null;
  serviceTitle?: string | null;
  completedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

export type DriverInsightMonthOption = {
  value: string; // YYYY-MM
  label: string; // e.g. November 2026
};

export type DriverWeeklyPoint = {
  week: string;
  range: string;
  total: number;
  completed: number;
  distanceKm: number;
  earningsTzs: number;
};

export type DriverTrendPoint = {
  month: string; // YYYY-MM
  label: string; // e.g. Nov
  total: number;
  completed: number;
  distanceKm: number;
  earningsTzs: number;
};

export type DriverStatusSlice = {
  key: string;
  name: string;
  value: number;
  color: string;
};

export type DriverTopRoutePoint = {
  name: string;
  trips: number;
  distanceKm: number;
};

export type DriverMonthlyTripRow = {
  id: number;
  reference: string;
  date: string;
  pickupTime: string;
  customer: string;
  origin: string;
  destination: string;
  passengers: number;
  distanceKm: number | null;
  durationMins: number | null;
  status: string;
  stage: DriverTripStage;
  fareTzs: number;
  companyName: string;
};

export type DriverMonthlyInsights = {
  month: string;
  monthLabel: string;
  availableMonths: DriverInsightMonthOption[];
  kpis: {
    totalTrips: number;
    completedTrips: number;
    activeTrips: number;
    confirmedTrips: number;
    pendingTrips: number;
    cancelledTrips: number;
    completionRatePct: number;
    totalDistanceKm: number;
    totalDurationMins: number;
    totalPassengers: number;
    totalEarningsTzs: number;
    avgDistanceKm: number;
  };
  weeklySeries: DriverWeeklyPoint[];
  sixMonthTrend: DriverTrendPoint[];
  statusBreakdown: DriverStatusSlice[];
  topDestinations: DriverTopRoutePoint[];
  trips: DriverMonthlyTripRow[];
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function parseMonthParam(raw: string | null | undefined, now = new Date()): string {
  if (raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw.trim())) {
    return raw.trim();
  }
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [yStr, mStr] = monthKey.split("-");
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  if (!Number.isFinite(year) || monthIdx < 0 || monthIdx > 11) return monthKey;
  return `${MONTH_NAMES[monthIdx]} ${year}`;
}

export function buildRecentMonthOptions(
  count = 12,
  now = new Date(),
): DriverInsightMonthOption[] {
  const result: DriverInsightMonthOption[] = [];
  const startYear = now.getUTCFullYear();
  const startMonth = now.getUTCMonth();

  for (let i = 0; i < count; i += 1) {
    const d = new Date(Date.UTC(startYear, startMonth - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    result.push({
      value: key,
      label: `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    });
  }
  return result;
}

function toUtcDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function numericFare(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function shortPlaceName(raw: string | null | undefined, fallback: string): string {
  const cleaned = (raw || "").trim();
  if (!cleaned) return fallback;
  return cleaned.split(",")[0].trim() || cleaned;
}

export function computeDriverMonthlyInsights(
  bookings: readonly DriverInsightBookingInput[],
  requestedMonth?: string | null,
  now = new Date(),
): DriverMonthlyInsights {
  const month = parseMonthParam(requestedMonth, now);
  const [yearNum, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(yearNum, monthNum, 0)).getUTCDate();

  const availableMonths = buildRecentMonthOptions(12, now);
  if (!availableMonths.some((opt) => opt.value === month)) {
    availableMonths.unshift({ value: month, label: formatMonthLabel(month) });
  }

  // Filter bookings belonging to the chosen month (by travelDate)
  const monthlyRecords: Array<{ record: DriverInsightBookingInput; date: Date }> = [];
  for (const record of bookings) {
    const date = toUtcDate(record.travelDate);
    if (!date) continue;
    if (monthKeyOf(date) === month) {
      monthlyRecords.push({ record, date });
    }
  }

  monthlyRecords.sort((a, b) => b.date.getTime() - a.date.getTime());

  let completedTrips = 0;
  let activeTrips = 0;
  let confirmedTrips = 0;
  let pendingTrips = 0;
  let cancelledTrips = 0;
  let totalDistanceKm = 0;
  let totalDurationMins = 0;
  let totalPassengers = 0;
  let totalEarningsTzs = 0;
  let distanceCount = 0;

  // Weekly buckets (W1: 1-7, W2: 8-14, W3: 15-21, W4: 22-28, W5: 29-end)
  const weekBuckets: DriverWeeklyPoint[] = [
    { week: "Week 1", range: "1–7", total: 0, completed: 0, distanceKm: 0, earningsTzs: 0 },
    { week: "Week 2", range: "8–14", total: 0, completed: 0, distanceKm: 0, earningsTzs: 0 },
    { week: "Week 3", range: "15–21", total: 0, completed: 0, distanceKm: 0, earningsTzs: 0 },
    { week: "Week 4", range: "22–28", total: 0, completed: 0, distanceKm: 0, earningsTzs: 0 },
  ];
  if (daysInMonth > 28) {
    weekBuckets.push({
      week: "Week 5",
      range: `29–${daysInMonth}`,
      total: 0,
      completed: 0,
      distanceKm: 0,
      earningsTzs: 0,
    });
  }

  const destMap = new Map<string, { trips: number; distanceKm: number }>();
  const trips: DriverMonthlyTripRow[] = [];

  for (const { record, date } of monthlyRecords) {
    const stage = resolveDriverStage({
      status: record.status,
      driverStage: record.driverStage,
    });
    const status = (record.status || "pending").toLowerCase();
    const fare = numericFare(record.totalPrice);
    const dist =
      typeof record.distanceKm === "number" && Number.isFinite(record.distanceKm) && record.distanceKm > 0
        ? record.distanceKm
        : 0;
    const dur =
      typeof record.durationMins === "number" && Number.isFinite(record.durationMins) && record.durationMins > 0
        ? record.durationMins
        : 0;

    if (status === "completed") completedTrips += 1;
    else if (status === "in_progress") activeTrips += 1;
    else if (status === "confirmed") confirmedTrips += 1;
    else if (status === "cancelled") cancelledTrips += 1;
    else pendingTrips += 1;

    if (status !== "cancelled") {
      totalPassengers += Math.max(0, record.passengers || 0);
      totalDistanceKm += dist;
      totalDurationMins += dur;
      if (dist > 0) distanceCount += 1;
      totalEarningsTzs += fare;
    }

    const dayOfMonth = date.getUTCDate();
    const weekIdx = Math.min(Math.floor((dayOfMonth - 1) / 7), weekBuckets.length - 1);
    const bucket = weekBuckets[weekIdx];
    if (bucket) {
      bucket.total += 1;
      if (status === "completed") bucket.completed += 1;
      if (status !== "cancelled") {
        bucket.distanceKm = Math.round((bucket.distanceKm + dist) * 10) / 10;
        bucket.earningsTzs += fare;
      }
    }

    const destName = shortPlaceName(record.destination, "Unspecified destination");
    if (status !== "cancelled") {
      const prevDest = destMap.get(destName) ?? { trips: 0, distanceKm: 0 };
      prevDest.trips += 1;
      prevDest.distanceKm = Math.round((prevDest.distanceKm + dist) * 10) / 10;
      destMap.set(destName, prevDest);
    }

    trips.push({
      id: record.id,
      reference: record.reference?.trim() || `#${record.id}`,
      date: date.toISOString().slice(0, 10),
      pickupTime: record.pickupTime || "—",
      customer: record.fullName || "Customer",
      origin: record.origin?.trim() || "Origin TBD",
      destination: record.destination?.trim() || "Destination TBD",
      passengers: record.passengers || 1,
      distanceKm: dist > 0 ? Math.round(dist * 10) / 10 : null,
      durationMins: dur > 0 ? Math.round(dur) : null,
      status,
      stage,
      fareTzs: fare,
      companyName: record.companyName?.trim() || "Public hire",
    });
  }

  const totalTrips = monthlyRecords.length;
  const nonCancelled = Math.max(0, totalTrips - cancelledTrips);
  const completionRatePct =
    nonCancelled > 0 ? Math.round((completedTrips / nonCancelled) * 100) : 0;

  // Build 6-month trend ending at selected month
  const sixMonthKeys: string[] = [];
  const trendMap = new Map<string, DriverTrendPoint>();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const d = new Date(Date.UTC(yearNum, monthNum - 1 - offset, 1));
    const key = monthKeyOf(d);
    sixMonthKeys.push(key);
    trendMap.set(key, {
      month: key,
      label: `${SHORT_MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(-2)}`,
      total: 0,
      completed: 0,
      distanceKm: 0,
      earningsTzs: 0,
    });
  }

  for (const record of bookings) {
    const date = toUtcDate(record.travelDate);
    if (!date) continue;
    const key = monthKeyOf(date);
    const point = trendMap.get(key);
    if (!point) continue;
    const status = (record.status || "pending").toLowerCase();
    const dist =
      typeof record.distanceKm === "number" && Number.isFinite(record.distanceKm) && record.distanceKm > 0
        ? record.distanceKm
        : 0;
    const fare = numericFare(record.totalPrice);
    point.total += 1;
    if (status === "completed") point.completed += 1;
    if (status !== "cancelled") {
      point.distanceKm = Math.round((point.distanceKm + dist) * 10) / 10;
      point.earningsTzs += fare;
    }
  }

  const sixMonthTrend = sixMonthKeys.map((key) => trendMap.get(key)!);

  const statusBreakdown: DriverStatusSlice[] = [
    { key: "completed", name: "Completed", value: completedTrips, color: "#15803d" },
    { key: "in_progress", name: "In progress", value: activeTrips, color: "#0f766e" },
    { key: "confirmed", name: "Confirmed", value: confirmedTrips, color: "#08428c" },
    { key: "pending", name: "Pending", value: pendingTrips, color: "#d97706" },
    { key: "cancelled", name: "Cancelled", value: cancelledTrips, color: "#be123c" },
  ].filter((item) => item.value > 0);

  const topDestinations: DriverTopRoutePoint[] = Array.from(destMap.entries())
    .map(([name, stats]) => ({ name, trips: stats.trips, distanceKm: stats.distanceKm }))
    .sort((a, b) => b.trips - a.trips || b.distanceKm - a.distanceKm)
    .slice(0, 6);

  return {
    month,
    monthLabel: formatMonthLabel(month),
    availableMonths,
    kpis: {
      totalTrips,
      completedTrips,
      activeTrips,
      confirmedTrips,
      pendingTrips,
      cancelledTrips,
      completionRatePct,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDurationMins: Math.round(totalDurationMins),
      totalPassengers,
      totalEarningsTzs: Math.round(totalEarningsTzs),
      avgDistanceKm:
        distanceCount > 0 ? Math.round((totalDistanceKm / distanceCount) * 10) / 10 : 0,
    },
    weeklySeries: weekBuckets,
    sixMonthTrend,
    statusBreakdown,
    topDestinations,
    trips,
  };
}

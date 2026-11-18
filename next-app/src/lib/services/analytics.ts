import "server-only";
import prisma from "@/lib/db/prisma";

export async function dashboardStats() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  const [tourRows, bookingRows, userRows, visitorRows, totalReviews, totalWorkspaces] =
    await Promise.all([
      prisma.$queryRaw<Array<{ totalTours: number; zanzibarTours: number; tanzaniaTours: number }>>`
        SELECT COUNT(*)::int AS "totalTours",
               COUNT(*) FILTER (WHERE category = 'zanzibar')::int AS "zanzibarTours",
               COUNT(*) FILTER (WHERE category = 'tanzania')::int AS "tanzaniaTours"
        FROM tours`,
      prisma.$queryRaw<Array<{ totalBookings: number; pendingBookings: number; confirmedBookings: number; cancelledBookings: number }>>`
        SELECT COUNT(*)::int AS "totalBookings",
               COUNT(*) FILTER (WHERE status = 'pending')::int AS "pendingBookings",
               COUNT(*) FILTER (WHERE status = 'confirmed')::int AS "confirmedBookings",
               COUNT(*) FILTER (WHERE status = 'cancelled')::int AS "cancelledBookings"
        FROM bookings`,
      prisma.$queryRaw<Array<{ totalUsers: number; newUsersToday: number; newUsersWeek: number; newUsersMonth: number }>>`
        SELECT COUNT(*)::int AS "totalUsers",
               COUNT(*) FILTER (WHERE date_joined >= ${today})::int AS "newUsersToday",
               COUNT(*) FILTER (WHERE date_joined >= ${weekAgo})::int AS "newUsersWeek",
               COUNT(*) FILTER (WHERE date_joined >= ${monthAgo})::int AS "newUsersMonth"
        FROM users`,
      prisma.$queryRaw<Array<{ totalVisitors: number; uniqueVisitors: number; loggedInVisitors: number; guestVisitors: number; visitorsToday: number; visitorsWeek: number; visitorsMonth: number }>>`
        SELECT COUNT(*)::int AS "totalVisitors",
               COUNT(DISTINCT session_id)::int AS "uniqueVisitors",
               COUNT(DISTINCT user_id) FILTER (WHERE is_authenticated AND user_id IS NOT NULL)::int AS "loggedInVisitors",
               COUNT(DISTINCT session_id) FILTER (WHERE NOT is_authenticated)::int AS "guestVisitors",
               COUNT(DISTINCT session_id) FILTER (WHERE created_at >= ${today})::int AS "visitorsToday",
               COUNT(DISTINCT session_id) FILTER (WHERE created_at >= ${weekAgo})::int AS "visitorsWeek",
               COUNT(DISTINCT session_id) FILTER (WHERE created_at >= ${monthAgo})::int AS "visitorsMonth"
        FROM visitor_tracking`,
      prisma.review.count(),
      prisma.workspace.count(),
    ]);

  const tours = tourRows[0];
  const bookings = bookingRows[0];
  const users = userRows[0];
  const visitors = visitorRows[0];
  return {
    total_tours: tours.totalTours,
    total_bookings: bookings.totalBookings,
    total_reviews: totalReviews,
    total_users: users.totalUsers,
    new_users_today: users.newUsersToday,
    new_users_week: users.newUsersWeek,
    new_users_month: users.newUsersMonth,
    pending_bookings: bookings.pendingBookings,
    confirmed_bookings: bookings.confirmedBookings,
    cancelled_bookings: bookings.cancelledBookings,
    zanzibar_tours: tours.zanzibarTours,
    tanzania_tours: tours.tanzaniaTours,
    total_visitors: visitors.totalVisitors,
    unique_visitors: visitors.uniqueVisitors,
    logged_in_visitors: visitors.loggedInVisitors,
    guest_visitors: visitors.guestVisitors,
    visitors_today: visitors.visitorsToday,
    visitors_week: visitors.visitorsWeek,
    visitors_month: visitors.visitorsMonth,
    total_workspaces: totalWorkspaces,
  };
}

export async function analytics() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - 29 * 86400000);
  const userStart = new Date(today.getTime() - 29 * 86400000);

  const [visitorsByDayRaw, newUsersByDayRaw, bookingsByMonthRaw, tourViews, visitorMetricsRows, pageViews] =
    await Promise.all([
      prisma.$queryRaw<{ day: Date; count: number }[]>`
        SELECT date_trunc('day', created_at)::date AS day,
               COUNT(DISTINCT session_id)::int AS count
        FROM visitor_tracking
        WHERE created_at >= ${start}
        GROUP BY 1
        ORDER BY 1`,
      prisma.$queryRaw<{ day: Date; count: number }[]>`
        SELECT date_trunc('day', date_joined)::date AS day,
               COUNT(*)::int AS count
        FROM users
        WHERE date_joined >= ${userStart}
        GROUP BY 1
        ORDER BY 1`,
      prisma.$queryRaw<{ month: string; count: number }[]>`
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
               COUNT(*)::int AS count
        FROM bookings
        WHERE created_at >= date_trunc('month', now()) - interval '5 months'
        GROUP BY 1
        ORDER BY 1`,
      prisma.visitorTracking.groupBy({
        by: ["tourId"],
        where: { tourId: { not: null } },
        _count: { sessionId: true },
        orderBy: { _count: { sessionId: "desc" } },
        take: 5,
      }),
      prisma.$queryRaw<Array<{ loggedIn: number; guests: number; totalVisits: number; uniqueVisitors: number }>>`
        SELECT COUNT(DISTINCT session_id) FILTER (WHERE is_authenticated)::int AS "loggedIn",
               COUNT(DISTINCT session_id) FILTER (WHERE NOT is_authenticated)::int AS "guests",
               COUNT(*)::int AS "totalVisits",
               COUNT(DISTINCT session_id)::int AS "uniqueVisitors"
        FROM visitor_tracking`,
      prisma.$queryRaw<{ page: string; count: number }[]>`
        SELECT page_url AS page, COUNT(*)::int AS count
        FROM visitor_tracking
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10`,
    ]);

  const visitorsMap = new Map(
    visitorsByDayRaw.map((row) => [new Date(row.day).toISOString().slice(0, 10), Number(row.count)]),
  );
  const visitors_by_day: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    visitors_by_day.push({ date, count: visitorsMap.get(date) ?? 0 });
  }

  const usersMap = new Map(
    newUsersByDayRaw.map((row) => [new Date(row.day).toISOString().slice(0, 10), Number(row.count)]),
  );
  const new_users_by_day: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    new_users_by_day.push({ date, count: usersMap.get(date) ?? 0 });
  }

  const bookingsMap = new Map(
    bookingsByMonthRaw.map((row) => [row.month, Number(row.count)]),
  );
  const bookings_by_month: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    bookings_by_month.push({ month: key, count: bookingsMap.get(key) ?? 0 });
  }

  const tours = await prisma.tour.findMany({
    where: { id: { in: tourViews.map((row) => row.tourId as number) } },
    select: { id: true, title: true },
  });
  const tourTitles = new Map(tours.map((tour) => [tour.id, tour.title]));
  const popular_tours = tourViews
    .map((row) => ({
      name: tourTitles.get(row.tourId as number) ?? `Tour #${row.tourId}`,
      views: Number(row._count.sessionId),
    }))
    .filter((row) => row.name);

  const pageViewsMap: Record<string, number> = {};
  for (const row of pageViews) {
    pageViewsMap[row.page || "/"] = Number(row.count);
  }
  const visitorMetrics = visitorMetricsRows[0];

  return {
    visitors_by_day,
    new_users_by_day,
    bookings_by_month,
    popular_tours,
    logged_in_vs_guests: { logged_in: visitorMetrics.loggedIn, guests: visitorMetrics.guests },
    // Extra metrics used by the admin UI.
    total_visits: visitorMetrics.totalVisits,
    unique_visitors: visitorMetrics.uniqueVisitors,
    average_visits_per_user:
      visitorMetrics.uniqueVisitors > 0 ? Math.round((visitorMetrics.totalVisits / visitorMetrics.uniqueVisitors) * 100) / 100 : 0,
    page_views: pageViewsMap,
  };
}

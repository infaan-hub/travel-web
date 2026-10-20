import "server-only";
import prisma from "@/lib/db/prisma";

export async function dashboardStats() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  const [
    totalTours,
    totalBookings,
    totalAttractions,
    totalReviews,
    totalUsers,
    totalTips,
    newUsersToday,
    newUsersWeek,
    newUsersMonth,
    pendingBookings,
    confirmedBookings,
    cancelledBookings,
    zanzibarTours,
    tanzaniaTours,
    totalVisitors,
    uniqueVisitors,
    loggedInVisitors,
    guestVisitors,
    visitorsToday,
    visitorsWeek,
    visitorsMonth,
    totalWorkspaces,
  ] = await Promise.all([
    prisma.tour.count(),
    prisma.booking.count(),
    prisma.attraction.count(),
    prisma.review.count(),
    prisma.user.count(),
    prisma.travelTip.count(),
    prisma.user.count({ where: { dateJoined: { gte: today } } }),
    prisma.user.count({ where: { dateJoined: { gte: weekAgo } } }),
    prisma.user.count({ where: { dateJoined: { gte: monthAgo } } }),
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.booking.count({ where: { status: "confirmed" } }),
    prisma.booking.count({ where: { status: "cancelled" } }),
    prisma.tour.count({ where: { category: "zanzibar" } }),
    prisma.tour.count({ where: { category: "tanzania" } }),
    prisma.visitorTracking.count(),
    prisma.visitorTracking.groupBy({ by: ["sessionId"] }).then((rows) => rows.length),
    prisma.visitorTracking
      .groupBy({ by: ["userId"], where: { isAuthenticated: true, userId: { not: null } } })
      .then((rows) => rows.length),
    prisma.visitorTracking
      .groupBy({ by: ["sessionId"], where: { isAuthenticated: false } })
      .then((rows) => rows.length),
    prisma.visitorTracking
      .groupBy({ by: ["sessionId"], where: { createdAt: { gte: today } } })
      .then((rows) => rows.length),
    prisma.visitorTracking
      .groupBy({ by: ["sessionId"], where: { createdAt: { gte: weekAgo } } })
      .then((rows) => rows.length),
    prisma.visitorTracking
      .groupBy({ by: ["sessionId"], where: { createdAt: { gte: monthAgo } } })
      .then((rows) => rows.length),
    prisma.workspace.count(),
  ]);

  return {
    total_tours: totalTours,
    total_bookings: totalBookings,
    total_attractions: totalAttractions,
    total_reviews: totalReviews,
    total_users: totalUsers,
    total_tips: totalTips,
    new_users_today: newUsersToday,
    new_users_week: newUsersWeek,
    new_users_month: newUsersMonth,
    pending_bookings: pendingBookings,
    confirmed_bookings: confirmedBookings,
    cancelled_bookings: cancelledBookings,
    zanzibar_tours: zanzibarTours,
    tanzania_tours: tanzaniaTours,
    total_visitors: totalVisitors,
    unique_visitors: uniqueVisitors,
    logged_in_visitors: loggedInVisitors,
    guest_visitors: guestVisitors,
    visitors_today: visitorsToday,
    visitors_week: visitorsWeek,
    visitors_month: visitorsMonth,
    total_workspaces: totalWorkspaces,
  };
}

export async function analytics() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - 29 * 86400000);
  const userStart = new Date(today.getTime() - 29 * 86400000);

  const [visitorsByDayRaw, newUsersByDayRaw, bookingsByMonthRaw, tourViews, loggedIn, guests, totalVisits, pageViews] =
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
      prisma.visitorTracking
        .groupBy({ by: ["sessionId"], where: { isAuthenticated: true } })
        .then((rows) => rows.length),
      prisma.visitorTracking
        .groupBy({ by: ["sessionId"], where: { isAuthenticated: false } })
        .then((rows) => rows.length),
      prisma.visitorTracking.count(),
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
  const uniqueVisitors = await prisma.visitorTracking
    .groupBy({ by: ["sessionId"] })
    .then((rows) => rows.length);

  return {
    visitors_by_day,
    new_users_by_day,
    bookings_by_month,
    popular_tours,
    logged_in_vs_guests: { logged_in: loggedIn, guests },
    // Extra metrics used by the admin UI.
    total_visits: totalVisits,
    unique_visitors: uniqueVisitors,
    average_visits_per_user:
      uniqueVisitors > 0 ? Math.round((totalVisits / uniqueVisitors) * 100) / 100 : 0,
    page_views: pageViewsMap,
  };
}

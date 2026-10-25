"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CompanyDashboardData } from "@/lib/services/company-workspace";
import styles from "@/features/pages/company-operations.module.css";

const STATUS_COLORS = ["#d89b39", "#4c9979", "#c96b65"];
const TOUR_COLORS = ["#4c9979", "#8a9aa3"];
const METRIC_COLORS = [
  "#d89b39",
  "#4c9979",
  "#c96b65",
  "#278bb6",
  "#5a9b83",
];
const TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #e5edf1",
    background: "#fff",
  },
};

export default function CompanyDashboardCharts({
  stats,
  upcoming,
}: {
  stats: Pick<
    CompanyDashboardData["stats"],
    | "bookings_pending"
    | "bookings_confirmed"
    | "bookings_cancelled"
    | "bookings_total"
    | "travelers_upcoming"
    | "travelers_total"
    | "tours_published"
    | "tours_unpublished"
    | "tours_total"
  >;
  upcoming: CompanyDashboardData["upcoming"];
}) {
  const bookingStatus = [
    { name: "Pending", value: stats.bookings_pending },
    { name: "Confirmed", value: stats.bookings_confirmed },
    { name: "Cancelled", value: stats.bookings_cancelled },
  ];
  const tourStatus = [
    { name: "Published", value: stats.tours_published },
    { name: "Unpublished", value: stats.tours_unpublished },
  ];
  const bookingMetrics = [
    { metric: "Pending", value: stats.bookings_pending },
    { metric: "Confirmed", value: stats.bookings_confirmed },
    { metric: "Cancelled", value: stats.bookings_cancelled },
    { metric: "Total bookings", value: stats.bookings_total },
    { metric: "Upcoming travelers", value: stats.travelers_upcoming },
  ];
  const tourMetrics = [
    { metric: "Published", value: stats.tours_published },
    { metric: "Unpublished", value: stats.tours_unpublished },
    { metric: "Total tours", value: stats.tours_total },
  ];

  return (
    <section className={styles.dashboardAnalytics} aria-label="Company data charts">
      <div className={styles.dashboardAnalyticsHead}>
        <div>
          <p className={styles.eyebrow}>At a glance</p>
          <h2 className={styles.dashboardAnalyticsTitle}>
            Dashboard statistics
          </h2>
          <p className={styles.panelCopy}>
            Every company metric below is rendered as a live chart built from
            the current booking and tour data.
          </p>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <section className={`glass-card ${styles.chartCard}`}>
          <h3 className={styles.chartTitle}>Booking status</h3>
          {bookingStatus.some((item) => item.value > 0) ? (
            <>
              <div
                className={styles.chartWrap}
                style={{ position: "relative" }}
                role="img"
                aria-label="Company bookings by pending, confirmed, and cancelled status"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bookingStatus}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={86}
                      paddingAngle={2}
                    >
                      {bookingStatus.map((item, index) => (
                        <Cell
                          key={item.name}
                          fill={STATUS_COLORS[index]}
                        />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    pointerEvents: "none",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-display)",
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {stats.bookings_total}
                    </div>
                    <div
                      style={{
                        color: "var(--text-light)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        marginTop: 4,
                      }}
                    >
                      Total bookings
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.legend}>
                {bookingStatus.map((item, index) => (
                  <span className={styles.legendItem} key={item.name}>
                    <span
                      className={styles.legendSwatch}
                      style={{ background: STATUS_COLORS[index] }}
                    />
                    {item.name}: {item.value}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.chartEmpty}>
              Booking status appears here after the first booking.
            </div>
          )}
        </section>

        <section className={`glass-card ${styles.chartCard}`}>
          <h3 className={styles.chartTitle}>Tour publication</h3>
          {tourStatus.some((item) => item.value > 0) ? (
            <>
              <div
                className={styles.chartWrap}
                style={{ position: "relative" }}
                role="img"
                aria-label="Company tours by published and unpublished status"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tourStatus}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={86}
                      paddingAngle={2}
                    >
                      {tourStatus.map((item, index) => (
                        <Cell key={item.name} fill={TOUR_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    pointerEvents: "none",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-display)",
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {stats.tours_total}
                    </div>
                    <div
                      style={{
                        color: "var(--text-light)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        marginTop: 4,
                      }}
                    >
                      Total tours
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.legend}>
                {tourStatus.map((item, index) => (
                  <span className={styles.legendItem} key={item.name}>
                    <span
                      className={styles.legendSwatch}
                      style={{ background: TOUR_COLORS[index] }}
                    />
                    {item.name}: {item.value}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.chartEmpty}>
              Tour publication appears here after a tour is added.
            </div>
          )}
        </section>

        <section className={`glass-card ${styles.chartCard}`}>
          <h3 className={styles.chartTitle}>Booking metrics</h3>
          <div
            className={styles.chartWrap}
            role="img"
            aria-label="Bar chart of pending, confirmed, cancelled, total bookings and upcoming travelers"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bookingMetrics}
                layout="vertical"
                margin={{ top: 8, right: 12, bottom: 4, left: 92 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e9eff2"
                  horizontal={false}
                />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="metric"
                  width={90}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]}>
                  {bookingMetrics.map((item, index) => (
                    <Cell
                      key={item.metric}
                      fill={METRIC_COLORS[index % METRIC_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={`glass-card ${styles.chartCard}`}>
          <h3 className={styles.chartTitle}>Tour metrics</h3>
          <div
            className={styles.chartWrap}
            role="img"
            aria-label="Bar chart of published, unpublished and total tours"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tourMetrics}
                layout="vertical"
                margin={{ top: 8, right: 12, bottom: 4, left: 92 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e9eff2"
                  horizontal={false}
                />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="metric"
                  width={90}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]}>
                  {tourMetrics.map((item, index) => (
                    <Cell
                      key={item.metric}
                      fill={TOUR_COLORS[index % TOUR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section
          className={`glass-card ${styles.chartCard} ${styles.dashboardUpcomingChart}`}
        >
          <h3 className={styles.chartTitle}>Upcoming travel · next 30 days</h3>
          {upcoming.length > 0 ? (
            <div
              className={styles.chartWrap}
              role="img"
              aria-label="Upcoming company bookings and travelers by travel date"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={upcoming}
                  margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e9eff2"
                    vertical={false}
                  />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip {...TOOLTIP} />
                  <Bar
                    dataKey="bookings"
                    name="Bookings"
                    fill="#278bb6"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="travelers"
                    name="Travelers"
                    fill="#5a9b83"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.chartEmpty}>
              No confirmed or pending travel is scheduled in the next 30 days.
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

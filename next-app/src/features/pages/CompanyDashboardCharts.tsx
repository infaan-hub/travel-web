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
import styles from "@/features/pages/company-dashboard.module.css";

const INK = "#4c5d76";
const GRID = "rgba(8, 66, 140, 0.1)";
const AXIS_LINE = "rgba(8, 66, 140, 0.18)";

const STATUS_COLORS = ["#b8790a", "#0e7c5a", "#b23a34"];
const TOUR_COLORS = ["#08428c", "#9fb0c4"];
const METRIC_COLORS = ["#b8790a", "#0e7c5a", "#b23a34", "#08428c", "#3b8ad9"];

const TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid rgba(8, 66, 140, 0.14)",
    background: "#ffffff",
    boxShadow: "0 12px 28px rgba(8, 66, 140, 0.16)",
    color: "#12223a",
    fontSize: 12,
    padding: "8px 10px",
  },
  labelStyle: { color: INK, fontSize: 11, fontWeight: 700 },
  itemStyle: { color: "#12223a" },
  cursor: { fill: "rgba(8, 66, 140, 0.06)" },
};

const AXIS = {
  tick: { fontSize: 11, fill: INK },
  axisLine: { stroke: AXIS_LINE },
  tickLine: false as const,
};

function DonutCenter({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.dashDonutCenter}>
      <div>
        <div className={styles.dashDonutValue}>{value}</div>
        <div className={styles.dashDonutLabel}>{label}</div>
      </div>
    </div>
  );
}

function Legend({
  items,
  colors,
}: {
  items: { name: string; value: number }[];
  colors: string[];
}) {
  return (
    <div className={styles.dashLegend}>
      {items.map((item, index) => (
        <span className={styles.dashLegendItem} key={item.name}>
          <span
            className={styles.dashLegendSwatch}
            style={{ background: colors[index] }}
          />
          {item.name}: {item.value}
        </span>
      ))}
    </div>
  );
}

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
    { metric: "Total", value: stats.bookings_total },
    { metric: "Travelers", value: stats.travelers_upcoming },
  ];
  const tourMetrics = [
    { metric: "Published", value: stats.tours_published },
    { metric: "Unpublished", value: stats.tours_unpublished },
    { metric: "Total tours", value: stats.tours_total },
  ];

  return (
    <section className={styles.dashCharts} aria-label="Company data charts">
      <div className={styles.dashSectionHead}>
        <div className={styles.dashSectionText}>
          <p className={styles.dashSectionKicker}>At a glance</p>
          <h2 className={styles.dashSectionTitle}>Dashboard statistics</h2>
          <p className={styles.dashSectionCopy}>
            Every company metric below is rendered as a live chart built from
            the current booking and tour data.
          </p>
        </div>
      </div>

      <div className={styles.dashChartGrid}>
        <section className={styles.dashChartCard}>
          <div className={styles.dashChartCardHead}>
            <h3 className={styles.dashChartTitle}>Booking status</h3>
            <span className={styles.dashChartHint}>All time</span>
          </div>
          {bookingStatus.some((item) => item.value > 0) ? (
            <>
              <div
                className={styles.dashChartWrap}
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
                      stroke="#ffffff"
                      strokeWidth={2}
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
                <DonutCenter
                  value={stats.bookings_total}
                  label="Total bookings"
                />
              </div>
              <Legend items={bookingStatus} colors={STATUS_COLORS} />
            </>
          ) : (
            <div className={styles.dashChartEmpty}>
              Booking status appears here after the first booking.
            </div>
          )}
        </section>

        <section className={styles.dashChartCard}>
          <div className={styles.dashChartCardHead}>
            <h3 className={styles.dashChartTitle}>Tour publication</h3>
            <span className={styles.dashChartHint}>Catalogue</span>
          </div>
          {tourStatus.some((item) => item.value > 0) ? (
            <>
              <div
                className={styles.dashChartWrap}
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
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {tourStatus.map((item, index) => (
                        <Cell key={item.name} fill={TOUR_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
                <DonutCenter value={stats.tours_total} label="Total tours" />
              </div>
              <Legend items={tourStatus} colors={TOUR_COLORS} />
            </>
          ) : (
            <div className={styles.dashChartEmpty}>
              Tour publication appears here after a tour is added.
            </div>
          )}
        </section>

        <section className={styles.dashChartCard}>
          <div className={styles.dashChartCardHead}>
            <h3 className={styles.dashChartTitle}>Booking metrics</h3>
            <span className={styles.dashChartHint}>Counts</span>
          </div>
          <div
            className={styles.dashChartWrap}
            role="img"
            aria-label="Bar chart of pending, confirmed, cancelled, total bookings and upcoming travelers"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bookingMetrics}
                layout="vertical"
                margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={GRID}
                  horizontal={false}
                />
                <XAxis type="number" allowDecimals={false} {...AXIS} />
                <YAxis
                  type="category"
                  dataKey="metric"
                  width={78}
                  {...AXIS}
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

        <section className={styles.dashChartCard}>
          <div className={styles.dashChartCardHead}>
            <h3 className={styles.dashChartTitle}>Tour metrics</h3>
            <span className={styles.dashChartHint}>Counts</span>
          </div>
          <div
            className={styles.dashChartWrap}
            role="img"
            aria-label="Bar chart of published, unpublished and total tours"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tourMetrics}
                layout="vertical"
                margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={GRID}
                  horizontal={false}
                />
                <XAxis type="number" allowDecimals={false} {...AXIS} />
                <YAxis
                  type="category"
                  dataKey="metric"
                  width={78}
                  {...AXIS}
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

        <section className={`${styles.dashChartCard} ${styles.dashChartCardWide}`}>
          <div className={styles.dashChartCardHead}>
            <h3 className={styles.dashChartTitle}>
              Upcoming travel · next 30 days
            </h3>
            <span className={styles.dashChartHint}>Schedule</span>
          </div>
          {upcoming.length > 0 ? (
            <div
              className={styles.dashChartWrap}
              role="img"
              aria-label="Upcoming company bookings and travelers by travel date"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={upcoming}
                  margin={{ top: 8, right: 16, bottom: 4, left: -18 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID}
                    vertical={false}
                  />
                  <XAxis dataKey="date" {...AXIS} />
                  <YAxis allowDecimals={false} {...AXIS} />
                  <Tooltip {...TOOLTIP} />
                  <Bar
                    dataKey="bookings"
                    name="Bookings"
                    fill="#08428c"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="travelers"
                    name="Travelers"
                    fill="#3b8ad9"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.dashChartEmpty}>
              No confirmed or pending travel is scheduled in the next 30 days.
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

"use client";

import {
  Activity,
  BarChart3,
  DollarSign,
  TrendingUp,
} from "@/components/icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "@/features/pages/company-analytics.module.css";

const STATUS_COLORS = ["#c58a2c", "#08428c", "#8b97a8"];
const TRAVELERS_COLOR = "#0f766e";
const BOOKED_VALUE_COLOR = "#7fa8dc";
const CONFIRMED_VALUE_COLOR = "#08428c";
const PUBLISHED_COLOR = "#08428c";
const UNPUBLISHED_COLOR = "#aab5c5";
const GRID_COLOR = "rgba(8, 66, 140, 0.12)";
const AXIS_TICK = { fontSize: 11, fill: "#5c6a82" };
const TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid rgba(8, 66, 140, 0.18)",
    background: "rgba(255, 255, 255, 0.98)",
    boxShadow: "0 14px 30px rgba(8, 66, 140, 0.14)",
    fontSize: "0.76rem",
  },
  labelStyle: { color: "#12223a", fontWeight: 700 },
  itemStyle: { color: "#44546c" },
};

function formatTzs(value: number) {
  return `TSh ${Math.round(value).toLocaleString("en-US")}`;
}

export default function CompanyAnalyticsCharts({
  bookingStatus,
  monthlyBookings,
  tourPerformance,
  hasBookingValue,
}: {
  bookingStatus: { name: string; value: number }[];
  monthlyBookings: {
    month: string;
    label: string;
    bookings: number;
    pending_bookings: number;
    confirmed_bookings: number;
    cancelled_bookings: number;
    travelers: number;
    booked_value_tzs: number;
    confirmed_value_tzs: number;
  }[];
  tourPerformance: {
    id: number;
    name: string;
    bookings: number;
    published: boolean;
  }[];
  hasBookingValue: boolean;
}) {
  const hasBookings = bookingStatus.some((item) => item.value > 0);
  const totalBookings = bookingStatus.reduce(
    (total, item) => total + item.value,
    0,
  );
  const hasMonthlyActivity = monthlyBookings.some(
    (month) => month.bookings > 0,
  );

  return (
    <div className={styles.analyticsChartsGrid}>
      <section className={styles.analyticsChartCard}>
        <div className={styles.analyticsChartHead}>
          <span className={styles.analyticsChartIcon} aria-hidden="true">
            <Activity size={18} />
          </span>
          <div className={styles.analyticsChartHeadText}>
            <h3 className={styles.analyticsChartTitle}>Booking status</h3>
            <p className={styles.analyticsChartCopy}>
              All bookings by current status.
            </p>
          </div>
          <span className={styles.analyticsChartBadge}>All time</span>
        </div>

        {hasBookings ? (
          <>
            <div
              className={`${styles.analyticsChartWrap} ${styles.analyticsDonutWrap}`}
              role="img"
              aria-label="Donut chart of company booking status distribution"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {bookingStatus.map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    {...TOOLTIP}
                    cursor={false}
                    formatter={(value) => [
                      `${Number(value ?? 0)} bookings`,
                      "Bookings",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.analyticsDonutCenter} aria-hidden="true">
                <span className={styles.analyticsDonutValue}>
                  {totalBookings}
                </span>
                <span className={styles.analyticsDonutLabel}>bookings</span>
              </div>
            </div>
            <div className={styles.analyticsLegend}>
              {bookingStatus.map((item, index) => (
                <span className={styles.analyticsLegendItem} key={item.name}>
                  <span
                    className={styles.analyticsLegendDot}
                    style={{
                      background: STATUS_COLORS[index % STATUS_COLORS.length],
                    }}
                  />
                  <span className={styles.analyticsLegendLabel}>
                    {item.name}
                  </span>
                  <span className={styles.analyticsLegendValue}>
                    {item.value} ·{" "}
                    {totalBookings > 0
                      ? Math.round((item.value / totalBookings) * 100)
                      : 0}
                    %
                  </span>
                </span>
              ))}
            </div>
            <p className={styles.analyticsChartNote}>
              Status counts cover all company bookings, including cancellations.
            </p>
          </>
        ) : (
          <div className={styles.analyticsChartEmpty}>
            <span className={styles.analyticsChartEmptyIcon} aria-hidden="true">
              <Activity size={20} />
            </span>
            <p className={styles.analyticsChartEmptyTitle}>
              No company bookings yet
            </p>
            <p className={styles.analyticsChartEmptyCopy}>
              The status split appears after the first booking request.
            </p>
          </div>
        )}
      </section>

      <section className={styles.analyticsChartCard}>
        <div className={styles.analyticsChartHead}>
          <span className={styles.analyticsChartIcon} aria-hidden="true">
            <BarChart3 size={18} />
          </span>
          <div className={styles.analyticsChartHeadText}>
            <h3 className={styles.analyticsChartTitle}>
              Booking activity by month
            </h3>
            <p className={styles.analyticsChartCopy}>
              Stacked statuses with non-cancelled travelers.
            </p>
          </div>
          <span className={styles.analyticsChartBadge}>6 months</span>
        </div>

        {hasMonthlyActivity ? (
          <>
            <div
              className={styles.analyticsChartWrap}
              role="img"
              aria-label="Company booking statuses and non-cancelled travelers for each of the last six months"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlyBookings}
                  margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID_COLOR}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={{ stroke: GRID_COLOR }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip {...TOOLTIP} />
                  <Bar
                    dataKey="pending_bookings"
                    name="Pending bookings"
                    stackId="bookings"
                    fill={STATUS_COLORS[0]}
                    maxBarSize={38}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="confirmed_bookings"
                    name="Confirmed bookings"
                    stackId="bookings"
                    fill={STATUS_COLORS[1]}
                    maxBarSize={38}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="cancelled_bookings"
                    name="Cancelled bookings"
                    stackId="bookings"
                    fill={STATUS_COLORS[2]}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={38}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="travelers"
                    name="Travelers (excluding cancelled)"
                    stroke={TRAVELERS_COLOR}
                    strokeWidth={2}
                    dot={{ fill: TRAVELERS_COLOR, r: 3 }}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.analyticsLegend}>
              {["Pending", "Confirmed", "Cancelled"].map((status, index) => (
                <span className={styles.analyticsLegendItem} key={status}>
                  <span
                    className={styles.analyticsLegendDot}
                    style={{ background: STATUS_COLORS[index] }}
                  />
                  {status}
                </span>
              ))}
              <span className={styles.analyticsLegendItem}>
                <span
                  className={styles.analyticsLegendDot}
                  style={{ background: TRAVELERS_COLOR }}
                />
                Travelers (cancelled excluded)
              </span>
            </div>
            <p className={styles.analyticsChartNote}>
              Bars stack booking counts by status; the line tracks non-cancelled
              travelers.
            </p>
          </>
        ) : (
          <div className={styles.analyticsChartEmpty}>
            <span className={styles.analyticsChartEmptyIcon} aria-hidden="true">
              <BarChart3 size={20} />
            </span>
            <p className={styles.analyticsChartEmptyTitle}>
              No recent booking activity
            </p>
            <p className={styles.analyticsChartEmptyCopy}>
              Monthly counts and traveler totals for the last six months appear
              after the first request.
            </p>
          </div>
        )}
      </section>

      <section className={styles.analyticsChartCard}>
        <div className={styles.analyticsChartHead}>
          <span className={styles.analyticsChartIcon} aria-hidden="true">
            <DollarSign size={18} />
          </span>
          <div className={styles.analyticsChartHeadText}>
            <h3 className={styles.analyticsChartTitle}>
              Booking value by month
            </h3>
            <p className={styles.analyticsChartCopy}>
              Saved value excluding cancellations, in TZS.
            </p>
          </div>
          <span className={styles.analyticsChartBadge}>6 months</span>
        </div>

        {hasBookingValue ? (
          <>
            <div
              className={styles.analyticsChartWrap}
              role="img"
              aria-label="Saved booking value excluding cancelled bookings, and confirmed booking value by month in Tanzanian shillings"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyBookings}
                  margin={{ top: 8, right: 4, bottom: 0, left: -6 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID_COLOR}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={{ stroke: GRID_COLOR }}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(value: number) =>
                      value >= 1_000_000
                        ? `${(value / 1_000_000).toFixed(1)}m`
                        : value >= 1_000
                          ? `${Math.round(value / 1_000)}k`
                          : String(value)
                    }
                  />
                  <Tooltip
                    {...TOOLTIP}
                    formatter={(value) => formatTzs(Number(value ?? 0))}
                  />
                  <Bar
                    dataKey="booked_value_tzs"
                    name="Booked value (non-cancelled)"
                    fill={BOOKED_VALUE_COLOR}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="confirmed_value_tzs"
                    name="Confirmed value"
                    fill={CONFIRMED_VALUE_COLOR}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.analyticsLegend}>
              <span className={styles.analyticsLegendItem}>
                <span
                  className={styles.analyticsLegendDot}
                  style={{ background: BOOKED_VALUE_COLOR }}
                />
                Booked value (non-cancelled)
              </span>
              <span className={styles.analyticsLegendItem}>
                <span
                  className={styles.analyticsLegendDot}
                  style={{ background: CONFIRMED_VALUE_COLOR }}
                />
                Confirmed value
              </span>
            </div>
            <p className={styles.analyticsChartNote}>
              Values use saved booking-time prices and are shown in TZS.
              Confirmed value is included in booked value.
            </p>
          </>
        ) : (
          <div className={styles.analyticsChartEmpty}>
            <span className={styles.analyticsChartEmptyIcon} aria-hidden="true">
              <DollarSign size={20} />
            </span>
            <p className={styles.analyticsChartEmptyTitle}>
              No recent booking value
            </p>
            <p className={styles.analyticsChartEmptyCopy}>
              Saved values for the last six months appear once bookings with a
              booking-time price arrive.
            </p>
          </div>
        )}
      </section>

      <section
        className={`${styles.analyticsChartCard} ${styles.analyticsChartCardWide}`}
      >
        <div className={styles.analyticsChartHead}>
          <span className={styles.analyticsChartIcon} aria-hidden="true">
            <TrendingUp size={18} />
          </span>
          <div className={styles.analyticsChartHeadText}>
            <h3 className={styles.analyticsChartTitle}>Tour performance</h3>
            <p className={styles.analyticsChartCopy}>
              Bookings by tour, ranked across the catalogue.
            </p>
          </div>
          <span className={styles.analyticsChartBadge}>Top 8</span>
        </div>

        {tourPerformance.length > 0 ? (
          <>
            <div
              className={`${styles.analyticsChartWrap} ${styles.analyticsChartWrapTall}`}
              role="img"
              aria-label="Bar chart of bookings by company tour"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tourPerformance}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID_COLOR}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={{ stroke: GRID_COLOR }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={160}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <Tooltip {...TOOLTIP} />
                  <Bar
                    dataKey="bookings"
                    name="Bookings"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={26}
                    isAnimationActive={false}
                  >
                    {tourPerformance.map((tour) => (
                      <Cell
                        key={tour.id}
                        fill={
                          tour.published ? PUBLISHED_COLOR : UNPUBLISHED_COLOR
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.analyticsLegend}>
              <span className={styles.analyticsLegendItem}>
                <span
                  className={styles.analyticsLegendDot}
                  style={{ background: PUBLISHED_COLOR }}
                />
                Published tours
              </span>
              <span className={styles.analyticsLegendItem}>
                <span
                  className={styles.analyticsLegendDot}
                  style={{ background: UNPUBLISHED_COLOR }}
                />
                Unpublished tours
              </span>
            </div>
            <p className={styles.analyticsChartNote}>
              Published tours are blue; unpublished tours are grey.
            </p>
          </>
        ) : (
          <div className={styles.analyticsChartEmpty}>
            <span className={styles.analyticsChartEmptyIcon} aria-hidden="true">
              <TrendingUp size={20} />
            </span>
            <p className={styles.analyticsChartEmptyTitle}>
              No tours to compare yet
            </p>
            <p className={styles.analyticsChartEmptyCopy}>
              Tour performance appears once the company publishes tours and
              starts receiving bookings.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

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
import styles from "@/features/pages/company-operations.module.css";

const COLORS = ["#d89b39", "#4c9979", "#c96b65"];
const TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid rgba(157,150,121,0.2)",
    background: "rgba(255,255,255,0.96)",
  },
};

function formatTzs(value: number) {
  return `TSh ${Math.round(value).toLocaleString("en-US")}`;
}

export default function CompanyAnalyticsCharts({
  bookingStatus,
  monthlyBookings,
  tourPerformance,
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
}) {
  const hasBookings = bookingStatus.some((item) => item.value > 0);

  return (
    <div className={styles.chartsGrid}>
      <section className={`glass-card ${styles.chartCard}`}>
        <h2 className={styles.chartTitle}>Booking status</h2>
        {hasBookings ? (
          <>
            <div
              className={styles.chartWrap}
              role="img"
              aria-label="Pie chart of company booking status distribution"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    dataKey="value"
                    label={({
                      name,
                      percent,
                    }: {
                      name?: string;
                      percent?: number;
                    }) =>
                      `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {bookingStatus.map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.legend}>
              {bookingStatus.map((item, index) => (
                <span className={styles.legendItem} key={item.name}>
                  <span
                    className={styles.legendSwatch}
                    style={{ background: COLORS[index % COLORS.length] }}
                  />
                  {item.name}: {item.value}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.chartEmpty}>No company bookings yet.</div>
        )}
      </section>

      <section className={`glass-card ${styles.chartCard}`}>
        <h2 className={styles.chartTitle}>Booking activity by month</h2>
        <div
          className={styles.chartWrap}
          role="img"
          aria-label="Company booking statuses and non-cancelled travelers for each of the last six months"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyBookings}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip {...TOOLTIP} />
              <Bar
                dataKey="pending_bookings"
                name="Pending bookings"
                stackId="bookings"
                fill={COLORS[0]}
              />
              <Bar
                dataKey="confirmed_bookings"
                name="Confirmed bookings"
                stackId="bookings"
                fill={COLORS[1]}
              />
              <Bar
                dataKey="cancelled_bookings"
                name="Cancelled bookings"
                stackId="bookings"
                fill={COLORS[2]}
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="travelers"
                name="Travelers (excluding cancelled)"
                stroke="#278bb6"
                strokeWidth={2}
                dot={{ fill: "#278bb6", r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.legend}>
          {["Pending", "Confirmed", "Cancelled"].map((status, index) => (
            <span className={styles.legendItem} key={status}>
              <span
                className={styles.legendSwatch}
                style={{ background: COLORS[index] }}
              />
              {status}
            </span>
          ))}
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: "#278bb6" }}
            />
            Travelers (cancelled excluded)
          </span>
        </div>
      </section>

      <section className={`glass-card ${styles.chartCard}`}>
        <h2 className={styles.chartTitle}>Booking value by month</h2>
        <div
          className={styles.chartWrap}
          role="img"
          aria-label="Saved booking value excluding cancelled bookings, and confirmed booking value by month in Tanzanian shillings"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyBookings}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,0,0,0.06)"
                vertical={false}
              />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 11 }}
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
                fill="#278bb6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="confirmed_value_tzs"
                name="Confirmed value"
                fill="#4c9979"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className={styles.formHint}>
          Values use saved booking-time prices, exclude cancellations, and are
          shown in TZS. Confirmed value is included in booked value.
        </p>
      </section>

      <section className={`glass-card ${styles.chartCard}`} style={{ gridColumn: "1 / -1" }}>
        <h2 className={styles.chartTitle}>Tour performance</h2>
        {tourPerformance.length > 0 ? (
          <div
            className={styles.chartWrap}
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
                  stroke="rgba(0,0,0,0.06)"
                  horizontal={false}
                />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="bookings" name="Bookings" radius={[0, 6, 6, 0]}>
                  {tourPerformance.map((tour) => (
                    <Cell
                      key={tour.id}
                      fill={tour.published ? "#0F6B6B" : "#B8B297"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={styles.chartEmpty}>
            No tours have been created for this company yet.
          </div>
        )}
        <p className={styles.formHint}>
          Teal bars are published tours; sand bars are unpublished tours.
        </p>
      </section>
    </div>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "@/features/pages/company-operations.module.css";

const COLORS = ["#F59E0B", "#10B981", "#EF4444", "#9D9679", "#B8B297"];
const TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid rgba(157,150,121,0.2)",
    background: "rgba(255,255,255,0.96)",
  },
};

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
    travelers: number;
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
        <h2 className={styles.chartTitle}>Bookings by month</h2>
        <div
          className={styles.chartWrap}
          role="img"
          aria-label="Line chart of company bookings over the last six months"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyBookings}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip {...TOOLTIP} />
              <Line
                type="monotone"
                dataKey="bookings"
                name="Bookings"
                stroke="#0F6B6B"
                strokeWidth={2}
                dot={{ fill: "#0F6B6B", r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="travelers"
                name="Travelers"
                stroke="#9D9679"
                strokeWidth={2}
                dot={{ fill: "#9D9679", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: "#0F6B6B" }}
            />
            Bookings
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: "#9D9679" }}
            />
            Travelers (cancelled excluded)
          </span>
        </div>
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

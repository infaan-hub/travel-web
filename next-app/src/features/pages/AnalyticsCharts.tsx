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

const COLORS = ["#9D9679", "#B8B297", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6"];

const TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid rgba(157,150,121,0.2)",
    background: "rgba(255,255,255,0.95)",
  },
};

type ChartProps = {
  tourData: { name: string; tours: number }[];
  bookingStatusData: { name: string; value: number }[];
  visitData: { page: string; visits: number }[];
};

/**
 * Recharts is heavy, so the charts are loaded on demand in a separate bundle
 * instead of shipping with the rest of the admin area.
 */
export default function AnalyticsCharts({ tourData, bookingStatusData, visitData }: ChartProps) {
  return (
    <div className="charts-grid">
      {tourData.length > 0 && (
        <div className="chart-card">
          <h3>Tours by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tourData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 13 }} />
              <Tooltip {...TOOLTIP} />
              <Bar dataKey="tours" fill="#9D9679" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {bookingStatusData.length > 0 && (
        <div className="chart-card">
          <h3>Booking Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={bookingStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {bookingStatusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {visitData.length > 0 && (
        <div className="chart-card full-width">
          <h3>Page Views</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={visitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="page" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 13 }} />
              <Tooltip {...TOOLTIP} />
              <Line
                type="monotone"
                dataKey="visits"
                stroke="#9D9679"
                strokeWidth={2}
                dot={{ fill: "#9D9679", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

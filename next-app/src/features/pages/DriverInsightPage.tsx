"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
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
import {
  BarChart3,
  Building2,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardList,
  Compass,
  Download,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Route as RouteIcon,
  Users,
  Wallet,
} from "lucide-react";
import { driverAPI } from "@/lib/api/client";
import type { DriverMonthlyInsights } from "@/lib/driver-insight-metrics";
import type { DriverFullContext } from "@/lib/services/driver-insight";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/driver-workspace.module.css";

type Props = {
  initialDriver: DriverFullContext;
  initialInsights: DriverMonthlyInsights;
};

const AXIS_TICK = { fontSize: 11, fill: "#526580" };
const GRID_STROKE = "rgba(8, 66, 140, 0.1)";
const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid rgba(8, 66, 140, 0.16)",
    background: "#ffffff",
    boxShadow: "0 12px 26px rgba(8, 66, 140, 0.14)",
    color: "#12223a",
    fontSize: 12,
  },
};

export default function DriverInsightPage({ initialDriver, initialInsights }: Props) {
  const toast = useToast();

  const [driver, setDriver] = useState<DriverFullContext>(initialDriver);
  const [insights, setInsights] = useState<DriverMonthlyInsights>(initialInsights);
  const [selectedMonth, setSelectedMonth] = useState(initialInsights.month);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadMonth = useCallback(
    async (monthKey: string) => {
      setLoading(true);
      try {
        const res = await driverAPI.getInsights(monthKey);
        if (res.data?.driver) setDriver(res.data.driver as DriverFullContext);
        if (res.data?.insights) setInsights(res.data.insights as DriverMonthlyInsights);
      } catch (error: unknown) {
        const axiosErr = error as { response?: { data?: { message?: string } } };
        toast.error(axiosErr?.response?.data?.message || "Could not refresh work insights.");
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const handleMonthChange = (nextMonth: string) => {
    setSelectedMonth(nextMonth);
    void loadMonth(nextMonth);
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const response = await fetch(
        `/api/driver/insight/pdf/?month=${encodeURIComponent(insights.month)}`,
        { credentials: "include" },
      );
      if (!response.ok) {
        throw new Error("Could not generate PDF report.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = driver.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "driver";
      link.href = url;
      link.download = `${safeName}-monthly-report-${insights.month}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${insights.monthLabel} PDF report.`);
    } catch {
      toast.error("Could not download the monthly PDF report. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const primaryVehicle = driver.vehicles[0];
  const driveHours = Math.floor(insights.kpis.totalDurationMins / 60);
  const driveRemMins = insights.kpis.totalDurationMins % 60;

  return (
    <main id="driver-workspace-root" className={`page ${styles.page}`}>
      <div className={styles.shell}>
        {/* TOP DRIVER WORKSPACE NAV */}
        <nav className={styles.topNav} aria-label="Driver workspace navigation">
          <div className={styles.topNavTabs}>
            <Link href="/driver/dashboard/" className={styles.topNavLink}>
              <LayoutDashboard size={15} aria-hidden="true" />
              Dashboard
            </Link>
            <Link href="/driver/bookings/" className={styles.topNavLink}>
              <ClipboardList size={15} aria-hidden="true" />
              Bookings
            </Link>
            <Link href="/driver/trips/" className={styles.topNavLink}>
              <Compass size={15} aria-hidden="true" />
              Trips
            </Link>
            <Link href="/driver/vehicle/" className={styles.topNavLink}>
              <Car size={15} aria-hidden="true" />
              Vehicle
            </Link>
            <Link
              href="/driver/insight/"
              className={`${styles.topNavLink} ${styles.topNavLinkActive}`}
              aria-current="page"
            >
              <BarChart3 size={15} aria-hidden="true" />
              Insight
            </Link>
          </div>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => void loadMonth(selectedMonth)}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? styles.spin : ""} aria-hidden="true" />
            Refresh
          </button>
        </nav>

        {/* EXECUTIVE HEADER + MONTH SELECTOR + PDF EXPORT */}
        <header className={styles.heroCard}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrowRow}>
              <span className={styles.eyebrow}>
                <BarChart3 size={13} aria-hidden="true" />
                Driver work analytics
              </span>
              <span className={styles.companyTag}>
                <Building2 size={12} aria-hidden="true" />
                {driver.company_name}
              </span>
              {primaryVehicle ? (
                <span className={styles.companyTag}>
                  <Car size={12} aria-hidden="true" />
                  {primaryVehicle.name} · {primaryVehicle.plate_number}
                </span>
              ) : null}
            </div>
            <h1 className={styles.heroTitle}>Work Insights — {insights.monthLabel}</h1>
            <p className={styles.heroLead}>
              Inspect monthly trip performance, driving distance, route breakdown, and export a
              designed full-month PDF work report for {driver.name}.
            </p>
          </div>

          <div className={styles.heroActions}>
            <div className={styles.monthPickerWrap}>
              <label htmlFor="driver-insight-month" className="sr-only">
                Select report month
              </label>
              <select
                id="driver-insight-month"
                className={styles.monthSelect}
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                disabled={loading}
              >
                {insights.availableMonths.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className={styles.btnPrimary}
              disabled={downloadingPdf || loading}
              onClick={() => void handleDownloadPdf()}
            >
              {downloadingPdf ? (
                <LoaderCircle size={16} className={styles.spin} aria-hidden="true" />
              ) : (
                <Download size={16} aria-hidden="true" />
              )}
              {downloadingPdf ? "Building PDF…" : "Download Monthly PDF"}
            </button>
          </div>
        </header>

        {/* 4 MONTHLY KPI CARDS */}
        <section className={styles.kpiGrid} aria-label="Monthly work KPIs">
          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Total trips</span>
              <span className={styles.kpiIcon} aria-hidden="true">
                <Car size={17} />
              </span>
            </div>
            <strong className={styles.kpiValue}>{insights.kpis.totalTrips}</strong>
            <span className={styles.kpiSub}>
              {insights.kpis.completedTrips} completed · {insights.kpis.completionRatePct}% rate
            </span>
          </article>

          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Distance driven</span>
              <span className={`${styles.kpiIcon} ${styles.kpiIconTeal}`} aria-hidden="true">
                <RouteIcon size={17} />
              </span>
            </div>
            <strong className={styles.kpiValue}>
              {insights.kpis.totalDistanceKm.toFixed(1)} km
            </strong>
            <span className={styles.kpiSub}>
              Avg {insights.kpis.avgDistanceKm.toFixed(1)} km per trip
            </span>
          </article>

          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Passengers</span>
              <span className={`${styles.kpiIcon} ${styles.kpiIconEmerald}`} aria-hidden="true">
                <Users size={17} />
              </span>
            </div>
            <strong className={styles.kpiValue}>{insights.kpis.totalPassengers}</strong>
            <span className={styles.kpiSub}>
              {driveHours}h {driveRemMins}m est. drive time
            </span>
          </article>

          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Recorded fares</span>
              <span className={`${styles.kpiIcon} ${styles.kpiIconAmber}`} aria-hidden="true">
                <Wallet size={17} />
              </span>
            </div>
            <strong className={styles.kpiValue}>
              {insights.kpis.totalEarningsTzs.toLocaleString("en-US")}
            </strong>
            <span className={styles.kpiSub}>TZS logged in {insights.monthLabel}</span>
          </article>
        </section>

        {/* 4 INTERACTIVE CHARTS & GRAPHS */}
        <section className={styles.chartsGrid} aria-label="Monthly work charts and graphs">
          {/* Chart 1: Weekly Trip Volume Bar Chart */}
          <article className={styles.chartCard}>
            <div className={styles.chartHead}>
              <div>
                <h2 className={styles.chartTitle}>Weekly trip volume</h2>
                <p className={styles.chartSub}>
                  Total assigned vs completed journeys by week ({insights.monthLabel})
                </p>
              </div>
            </div>
            <div className={styles.chartFrame}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.weeklySeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="total" name="Total trips" fill="#08428c" radius={[6, 6, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="completed" name="Completed" fill="#15803d" radius={[6, 6, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.chartLegend}>
              <span className={styles.chartLegendItem}>
                <span className={styles.chartLegendDot} style={{ background: "#08428c" }} />
                Total trips
              </span>
              <span className={styles.chartLegendItem}>
                <span className={styles.chartLegendDot} style={{ background: "#15803d" }} />
                Completed trips
              </span>
            </div>
          </article>

          {/* Chart 2: 6-Month Performance Trend Area Chart */}
          <article className={styles.chartCard}>
            <div className={styles.chartHead}>
              <div>
                <h2 className={styles.chartTitle}>6-month performance trend</h2>
                <p className={styles.chartSub}>
                  Monthly trips &amp; completed volume leading up to {insights.monthLabel}
                </p>
              </div>
            </div>
            <div className={styles.chartFrame}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insights.sixMonthTrend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="driverTotalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#08428c" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#08428c" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="driverDoneGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#15803d" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#15803d" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total trips"
                    stroke="#08428c"
                    strokeWidth={2.4}
                    fill="url(#driverTotalGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#15803d"
                    strokeWidth={2.4}
                    fill="url(#driverDoneGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.chartLegend}>
              <span className={styles.chartLegendItem}>
                <span className={styles.chartLegendDot} style={{ background: "#08428c" }} />
                Total trips
              </span>
              <span className={styles.chartLegendItem}>
                <span className={styles.chartLegendDot} style={{ background: "#15803d" }} />
                Completed
              </span>
            </div>
          </article>

          {/* Chart 3: Trip Status Breakdown Donut */}
          <article className={styles.chartCard}>
            <div className={styles.chartHead}>
              <div>
                <h2 className={styles.chartTitle}>Status distribution</h2>
                <p className={styles.chartSub}>
                  Breakdown of all bookings in {insights.monthLabel}
                </p>
              </div>
            </div>
            <div className={styles.chartFrame}>
              {insights.statusBreakdown.length === 0 ? (
                <div className={styles.stateCard} style={{ height: "100%", border: 0 }}>
                  <p>No trips recorded in {insights.monthLabel} yet.</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={insights.statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={92}
                        paddingAngle={3}
                      >
                        {insights.statusBreakdown.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={styles.donutCenter}>
                    <div>
                      <strong>{insights.kpis.totalTrips}</strong>
                      <span>Trips</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className={styles.chartLegend}>
              {insights.statusBreakdown.map((item) => (
                <span className={styles.chartLegendItem} key={item.key}>
                  <span className={styles.chartLegendDot} style={{ background: item.color }} />
                  {item.name}: {item.value}
                </span>
              ))}
            </div>
          </article>

          {/* Chart 4: Top Destinations Driven Horizontal Bar Chart */}
          <article className={styles.chartCard}>
            <div className={styles.chartHead}>
              <div>
                <h2 className={styles.chartTitle}>Top destinations driven</h2>
                <p className={styles.chartSub}>
                  Most frequent drop-off areas in {insights.monthLabel}
                </p>
              </div>
            </div>
            <div className={styles.chartFrame}>
              {insights.topDestinations.length === 0 ? (
                <div className={styles.stateCard} style={{ height: "100%", border: 0 }}>
                  <p>Top destination stats appear once trips are logged for this month.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={insights.topDestinations}
                    layout="vertical"
                    margin={{ top: 4, right: 18, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="trips" name="Trips" fill="#0f766e" radius={[0, 6, 6, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
        </section>

        {/* FULL MONTHLY TRIPS LEDGER + PDF DOWNLOAD FOOTER */}
        <section className={styles.panel} aria-labelledby="monthly-ledger-heading">
          <header className={styles.panelHead}>
            <div className={styles.panelHeadCopy}>
              <span className={styles.eyebrow}>
                <FileText size={13} aria-hidden="true" />
                Monthly work statement
              </span>
              <h2 id="monthly-ledger-heading" className={styles.panelTitle}>
                Full trip records — {insights.monthLabel} ({insights.trips.length})
              </h2>
              <p className={styles.panelSub}>
                Every trip in this table, along with your monthly KPIs and weekly chart, is
                included in the downloadable PDF report.
              </p>
            </div>
            <button
              type="button"
              className={styles.btnSecondary}
              disabled={downloadingPdf || loading}
              onClick={() => void handleDownloadPdf()}
            >
              <Download size={15} aria-hidden="true" />
              Export {insights.monthLabel} PDF
            </button>
          </header>

          {insights.trips.length === 0 ? (
            <div className={styles.stateCard}>
              <span className={styles.stateIcon} aria-hidden="true">
                <CalendarDays size={26} />
              </span>
              <h3>No trips logged in {insights.monthLabel}</h3>
              <p>
                Pick another month from the selector above to inspect past months, or still download
                a verified zero-activity monthly PDF statement if needed.
              </p>
            </div>
          ) : (
            <div className={styles.ledgerWrap}>
              <table className={styles.ledgerTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Ref</th>
                    <th>Route (Origin → Destination)</th>
                    <th>Customer</th>
                    <th>Pax</th>
                    <th>Distance</th>
                    <th>Status</th>
                    <th>Fare (TZS)</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.trips.map((trip) => (
                    <tr key={trip.id}>
                      <td>{trip.date}</td>
                      <td>
                        <strong>{trip.reference}</strong>
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <MapPin size={13} aria-hidden="true" />
                          {trip.origin.split(",")[0]} → {trip.destination.split(",")[0]}
                        </span>
                      </td>
                      <td>{trip.customer}</td>
                      <td>{trip.passengers}</td>
                      <td>{trip.distanceKm != null ? `${trip.distanceKm.toFixed(1)} km` : "—"}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            trip.status === "completed"
                              ? styles.statusConfirmed
                              : trip.status === "in_progress"
                                ? styles.statusLive
                                : styles.statusPending
                          }`}
                        >
                          {trip.status === "completed" ? (
                            <CheckCircle2 size={12} aria-hidden="true" />
                          ) : null}
                          {trip.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        {trip.fareTzs > 0 ? trip.fareTzs.toLocaleString("en-US") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

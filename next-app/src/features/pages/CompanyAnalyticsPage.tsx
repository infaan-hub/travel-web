import Link from "next/link";
import {
  BarChart3,
  CheckCircle,
  ClipboardList,
  Eye,
  Globe,
  Hourglass,
  Users,
  XCircle,
  Star,
} from "@/components/icons";
import type { CompanyAnalyticsData } from "@/lib/services/company-workspace";
import type { CompanyContext } from "@/lib/auth/company";
import CompanyAnalyticsCharts from "@/features/pages/CompanyAnalyticsClient";
import styles from "@/features/pages/company-operations.module.css";

export default function CompanyAnalyticsPage({
  context,
  data,
}: {
  context: CompanyContext;
  data: CompanyAnalyticsData;
}) {
  const pending =
    data.booking_status.find((item) => item.name === "Pending")?.value ?? 0;
  const confirmed =
    data.booking_status.find((item) => item.name === "Confirmed")?.value ?? 0;
  const cancelled =
    data.booking_status.find((item) => item.name === "Cancelled")?.value ?? 0;
  const analyticsMetrics = [
    {
      label: "Confirmation rate",
      value:
        data.totals.confirmation_rate_pct === null
          ? "—"
          : `${data.totals.confirmation_rate_pct.toFixed(1)}%`,
      hint: "Confirmed ÷ pending and confirmed bookings",
      icon: CheckCircle,
    },
    {
      label: "Cancellation rate",
      value:
        data.totals.cancellation_rate_pct === null
          ? "—"
          : `${data.totals.cancellation_rate_pct.toFixed(1)}%`,
      hint: "Cancelled ÷ all company bookings",
      icon: XCircle,
    },
    {
      label: "Average group size",
      value:
        data.totals.average_travelers_per_booking === null
          ? "—"
          : data.totals.average_travelers_per_booking.toFixed(2),
      hint: "Travelers ÷ non-cancelled bookings",
      icon: Users,
    },
    {
      label: "Average booked value",
      value:
        data.totals.average_booked_value_tzs === null
          ? "—"
          : `TSh ${Math.round(
              data.totals.average_booked_value_tzs,
            ).toLocaleString("en-US")}`,
      hint: "Saved value ÷ priced, non-cancelled bookings",
      icon: BarChart3,
    },
  ];

  const stats = [
    {
      label: "Total bookings",
      value: data.totals.bookings,
      hint: "All company bookings",
      icon: ClipboardList,
    },
    {
      label: "Travelers",
      value: data.totals.travelers,
      hint: "Cancelled bookings excluded",
      icon: Users,
    },
    {
      label: "Tours",
      value: data.totals.tours,
      hint: "Active company catalogue",
      icon: Globe,
    },
    {
      label: "Tour page views",
      value: data.totals.tour_views,
      hint: "Tracked visits to this company's tour pages",
      icon: Eye,
    },
    {
      label: "Approved reviews",
      value: data.totals.reviews,
      hint: data.totals.average_rating
        ? `${Number(data.totals.average_rating).toFixed(1)} average stars`
        : "No approved ratings yet",
      icon: Star,
    },
    {
      label: "Pending",
      value: pending,
      hint: "Awaiting confirmation",
      icon: Hourglass,
    },
    {
      label: "Confirmed",
      value: confirmed,
      hint: "Ready to operate",
      icon: CheckCircle,
    },
    {
      label: "Cancelled",
      value: cancelled,
      hint: "Retained for history",
      icon: XCircle,
    },
    {
      label: "Booked value",
      value: `TSh ${Math.round(data.totals.booked_value_tzs).toLocaleString("en-US")}`,
      hint: "Pending and confirmed; cancelled excluded",
      icon: BarChart3,
    },
    {
      label: "Confirmed value",
      value: `TSh ${Math.round(data.totals.confirmed_value_tzs).toLocaleString("en-US")}`,
      hint: "Booking-time price snapshots in TZS",
      icon: CheckCircle,
    },
  ];

  return (
    <div className={`page ${styles.pageStack}`}>
      <div className={styles.pageHead}>
        <div className={styles.pageTitleWrap}>
          <p className={styles.eyebrow}>Company workspace</p>
          <h1 className={styles.pageTitle}>Analytics</h1>
          <p className={styles.pageLead}>
            Booking and tour performance for {context.company.name}. Platform
            traffic and other companies&apos; data are never included.
          </p>
        </div>
        <div className={styles.pageActions}>
          {context.permissions.includes("reports:export") ? (
            <a className="btn btn-outline" href="/api/company/reports/bookings">
              Export booking values
            </a>
          ) : null}
          <Link className="btn btn-outline" href="/company/dashboard/">
            <BarChart3 size={16} /> Dashboard
          </Link>
        </div>
      </div>

      {data.totals.bookings_without_price > 0 ? (
        <p className={styles.note} role="status">
          {data.totals.bookings_without_price} older booking
          {data.totals.bookings_without_price === 1 ? " has" : "s have"} no saved
          booking-time price, so those records are excluded from value totals.
        </p>
      ) : null}
      <p className={styles.note}>
        Booking value reflects saved prices at booking time. It is not a record
        of payments received or refunds.
      </p>

      <section className={styles.analyticsStats} aria-label="Company totals">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className={styles.statCard} key={stat.label}>
              <div className={styles.statTop}>
                <span className={styles.statIcon}>
                  <Icon size={17} />
                </span>
              </div>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
              <span className={styles.statHint}>{stat.hint}</span>
            </article>
          );
        })}
      </section>

      <section className={styles.insightStats} aria-label="Calculated performance metrics">
        {analyticsMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className={styles.statCard} key={metric.label}>
              <div className={styles.statTop}>
                <span className={styles.statIcon}>
                  <Icon size={17} />
                </span>
              </div>
              <span className={styles.statValue}>{metric.value}</span>
              <span className={styles.statLabel}>{metric.label}</span>
              <span className={styles.statHint}>{metric.hint}</span>
            </article>
          );
        })}
      </section>

      {data.totals.bookings === 0 && data.totals.tours === 0 ? (
        <p className={styles.note}>
          This company has no tours or bookings yet. The charts below will
          populate as the team adds tours and customers book them.
        </p>
      ) : null}

      <CompanyAnalyticsCharts
        bookingStatus={data.booking_status}
        monthlyBookings={data.monthly_bookings}
        tourPerformance={data.tour_performance}
      />
    </div>
  );
}

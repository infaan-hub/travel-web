import Link from "next/link";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle,
  ClipboardList,
  DollarSign,
  Eye,
  Globe,
  Hourglass,
  Save,
  Shield,
  Star,
  TrendingUp,
  Users,
  XCircle,
} from "@/components/icons";
import type { CompanyAnalyticsData } from "@/lib/services/company-workspace";
import type { CompanyContext } from "@/lib/auth/company";
import CompanyAnalyticsCharts from "@/features/pages/CompanyAnalyticsClient";
import styles from "@/features/pages/company-analytics.module.css";

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

function formatTzs(value: number) {
  return `TSh ${Math.round(value).toLocaleString("en-US")}`;
}

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

  const headlineStats = [
    {
      label: "Total bookings",
      value: formatCount(data.totals.bookings),
      hint: "All time; every status included",
      icon: ClipboardList,
    },
    {
      label: "Travelers",
      value: formatCount(data.totals.travelers),
      hint: "Cancelled bookings excluded",
      icon: Users,
    },
    {
      label: "Booked value",
      value: formatTzs(data.totals.booked_value_tzs),
      hint: "Pending + confirmed; cancelled excluded",
      icon: DollarSign,
    },
    {
      label: "Confirmed value",
      value: formatTzs(data.totals.confirmed_value_tzs),
      hint: "Confirmed bookings only",
      icon: CheckCircle,
    },
  ];

  const stats = [
    {
      label: "Tours",
      value: formatCount(data.totals.tours),
      hint: "Active company catalogue",
      icon: Globe,
    },
    {
      label: "Tour page views",
      value: formatCount(data.totals.tour_views),
      hint: "Tracked visits to this company's tour pages",
      icon: Eye,
    },
    {
      label: "Approved reviews",
      value: formatCount(data.totals.reviews),
      hint: data.totals.average_rating
        ? `${Number(data.totals.average_rating).toFixed(1)} average stars`
        : "No approved ratings yet",
      icon: Star,
    },
    {
      label: "Pending",
      value: formatCount(pending),
      hint: "Awaiting confirmation",
      icon: Hourglass,
    },
    {
      label: "Confirmed",
      value: formatCount(confirmed),
      hint: "Ready to operate",
      icon: CheckCircle,
    },
    {
      label: "Cancelled",
      value: formatCount(cancelled),
      hint: "Retained for history",
      icon: XCircle,
    },
  ];

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
      hint: "Travelers ÷ active bookings",
      icon: Users,
    },
    {
      label: "Average booked value",
      value:
        data.totals.average_booked_value_tzs === null
          ? "—"
          : formatTzs(data.totals.average_booked_value_tzs),
      hint: "Booked value ÷ priced, active bookings",
      icon: BarChart3,
    },
  ];

  const hasNoActivity =
    data.totals.bookings === 0 && data.totals.tours === 0;
  const hasBookingValue = data.monthly_bookings.some(
    (month) => month.booked_value_tzs > 0 || month.confirmed_value_tzs > 0,
  );

  return (
    <div id="analytics-workspace" className={styles.analyticsRoot}>
      <header className={styles.analyticsMasthead}>
        <div className={styles.analyticsMastheadText}>
          <nav className={styles.analyticsBreadcrumb} aria-label="Breadcrumb">
            <Link href="/company/dashboard/">Company workspace</Link>
            <span className={styles.analyticsBreadcrumbSep} aria-hidden="true">
              /
            </span>
            <span className={styles.analyticsBreadcrumbCurrent}>Analytics</span>
          </nav>
          <p className={styles.analyticsEyebrow}>Company workspace</p>
          <h1 className={styles.analyticsTitle}>Analytics</h1>
          <p className={styles.analyticsLead}>
            Booking and tour performance for {context.company.name}. Platform
            traffic and other companies&apos; data are never included.
          </p>
        </div>
        <div className={styles.analyticsActions}>
          {context.permissions.includes("reports:export") ? (
            <a
              className="btn btn-primary"
              href="/api/company/reports/bookings"
            >
              <Save size={16} aria-hidden="true" />
              Export booking values
            </a>
          ) : null}
          <Link className="btn btn-outline" href="/company/dashboard/">
            <BarChart3 size={16} aria-hidden="true" />
            Dashboard
          </Link>
        </div>
      </header>

      <section
        className={styles.analyticsHero}
        aria-label="Performance snapshot"
      >
        <div className={styles.analyticsHeroMain}>
          <div className={styles.analyticsHeroHead}>
            <span className={styles.analyticsHeroIcon} aria-hidden="true">
              <TrendingUp size={23} />
            </span>
            <div>
              <h2 className={styles.analyticsHeroTitle}>Performance snapshot</h2>
              <p className={styles.analyticsHeroCopy}>
                Headline booking volume and saved value for this company.
                Figures cover all bookings recorded for the account.
              </p>
            </div>
          </div>

          <ul className={styles.analyticsKpiRow}>
            {headlineStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <li className={styles.analyticsKpi} key={stat.label}>
                  <span className={styles.analyticsKpiLabel}>
                    <Icon size={13} aria-hidden="true" />
                    {stat.label}
                  </span>
                  <span className={styles.analyticsKpiValue}>{stat.value}</span>
                  <span className={styles.analyticsKpiHint}>{stat.hint}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <aside className={styles.analyticsAside}>
          <div className={styles.analyticsAsideMain}>
            <p className={styles.analyticsAsideLabel}>Reporting window</p>
            <p className={styles.analyticsAsideValue}>Last 6 months</p>
            <p className={styles.analyticsAsideCopy}>
              Monthly activity and value charts cover the six most recent
              calendar months. Every other figure is an all-time company total.
            </p>
          </div>
          <ul className={styles.analyticsAsideList}>
            <li>
              <Shield size={14} aria-hidden="true" />
              Company-only data
            </li>
            <li>
              <DollarSign size={14} aria-hidden="true" />
              Saved prices in TZS
            </li>
          </ul>
        </aside>
      </section>

      <div className={styles.analyticsNoticeGrid}>
        {data.totals.bookings_without_price > 0 ? (
          <div
            className={`${styles.analyticsNotice} ${styles.analyticsNoticeWarn}`}
            role="status"
          >
            <span className={styles.analyticsNoticeIcon} aria-hidden="true">
              <AlertCircle size={17} />
            </span>
            <div className={styles.analyticsNoticeBody}>
              <strong className={styles.analyticsNoticeTitle}>
                Pricing coverage
              </strong>
              <p className={styles.analyticsNoticeCopy}>
                {formatCount(data.totals.bookings_without_price)} older booking
                {data.totals.bookings_without_price === 1 ? " has" : "s have"}{" "}
                no saved booking-time price, so those records are excluded from
                value totals.
              </p>
            </div>
          </div>
        ) : null}
        <div className={styles.analyticsNotice}>
          <span className={styles.analyticsNoticeIcon} aria-hidden="true">
            <Shield size={17} />
          </span>
          <div className={styles.analyticsNoticeBody}>
            <strong className={styles.analyticsNoticeTitle}>
              How value is measured
            </strong>
            <p className={styles.analyticsNoticeCopy}>
              Booking value reflects saved prices at booking time. It is not a
              record of payments received or refunds.
            </p>
          </div>
        </div>
      </div>

      <section
        className={styles.analyticsSection}
        aria-labelledby="analytics-totals-title"
      >
        <div className={styles.analyticsSectionHead}>
          <span className={styles.analyticsSectionIcon} aria-hidden="true">
            <ClipboardList size={19} />
          </span>
          <div className={styles.analyticsSectionHeadText}>
            <h2
              className={styles.analyticsSectionTitle}
              id="analytics-totals-title"
            >
              Company totals
            </h2>
            <p className={styles.analyticsSectionCopy}>
              All-time volume, catalogue reach, and booking status counts.
            </p>
          </div>
          <span className={styles.analyticsSectionBadge}>All time</span>
        </div>

        <div className={styles.analyticsStatsGrid}>
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article className={styles.analyticsStatCard} key={stat.label}>
                <div className={styles.analyticsStatTop}>
                  <span className={styles.analyticsStatIcon} aria-hidden="true">
                    <Icon size={17} />
                  </span>
                </div>
                <span className={styles.analyticsStatValue}>{stat.value}</span>
                <span className={styles.analyticsStatLabel}>{stat.label}</span>
                <span className={styles.analyticsStatHint}>{stat.hint}</span>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className={styles.analyticsSection}
        aria-labelledby="analytics-metrics-title"
      >
        <div className={styles.analyticsSectionHead}>
          <span className={styles.analyticsSectionIcon} aria-hidden="true">
            <BarChart3 size={19} />
          </span>
          <div className={styles.analyticsSectionHeadText}>
            <h2
              className={styles.analyticsSectionTitle}
              id="analytics-metrics-title"
            >
              Calculated performance
            </h2>
            <p className={styles.analyticsSectionCopy}>
              Ratios and averages derived from the company&apos;s bookings.
            </p>
          </div>
          <span className={styles.analyticsSectionBadge}>Derived</span>
        </div>

        <div className={styles.analyticsMetricGrid}>
          {analyticsMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article
                className={`${styles.analyticsStatCard} ${styles.analyticsStatCardMetric}`}
                key={metric.label}
              >
                <div className={styles.analyticsStatTop}>
                  <span className={styles.analyticsStatIcon} aria-hidden="true">
                    <Icon size={17} />
                  </span>
                </div>
                <span
                  className={`${styles.analyticsStatValue}${
                    metric.value === "—"
                      ? ` ${styles.analyticsStatValueMuted}`
                      : ""
                  }`}
                >
                  {metric.value}
                </span>
                <span className={styles.analyticsStatLabel}>
                  {metric.label}
                </span>
                <span className={styles.analyticsStatHint}>{metric.hint}</span>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className={styles.analyticsSection}
        aria-labelledby="analytics-trends-title"
      >
        <div className={styles.analyticsSectionHead}>
          <span className={styles.analyticsSectionIcon} aria-hidden="true">
            <Activity size={19} />
          </span>
          <div className={styles.analyticsSectionHeadText}>
            <h2
              className={styles.analyticsSectionTitle}
              id="analytics-trends-title"
            >
              Trends &amp; distribution
            </h2>
            <p className={styles.analyticsSectionCopy}>
              Booking status, monthly activity, saved value, and tour
              performance.
            </p>
          </div>
          <span className={styles.analyticsSectionBadge}>Visual review</span>
        </div>

        {hasNoActivity ? (
          <p className={styles.analyticsSectionNote}>
            <Activity size={15} aria-hidden="true" />
            This company has no tours or bookings yet. The charts below will
            populate as the team adds tours and customers book them.
          </p>
        ) : null}

        <CompanyAnalyticsCharts
          bookingStatus={data.booking_status}
          monthlyBookings={data.monthly_bookings}
          tourPerformance={data.tour_performance}
          hasBookingValue={hasBookingValue}
        />
      </section>
    </div>
  );
}

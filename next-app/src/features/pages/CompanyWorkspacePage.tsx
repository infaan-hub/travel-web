import Image from "next/image";
import Link from "next/link";
import type { CompanyContext } from "@/lib/auth/company";
import type { CompanySwitcherOption } from "@/components/CompanySwitcher";
import CompanySwitcher from "@/components/CompanySwitcher";
import CompanyDashboardCharts from "@/features/pages/CompanyDashboardChartsClient";
import type { AppIcon } from "@/components/icons";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  Clock,
  Globe,
  Hourglass,
  MapPin,
  Plus,
  Shield,
  Users,
  XCircle,
} from "@/components/icons";
import {
  COMPANY_PERMISSION_LABELS,
  COMPANY_ROLE_LABELS,
} from "@/lib/company-access";
import type { CompanyDashboardData } from "@/lib/services/company-workspace";
import { publicImageUrl } from "@/lib/storage/images";
import styles from "@/features/pages/company-operations.module.css";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending review",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  ARCHIVED: "Archived",
};

const BUSINESS_LABELS: Record<string, string> = {
  TOUR_OPERATOR: "Tour operator",
  SAFARI_OPERATOR: "Safari operator",
  EXCURSION_PROVIDER: "Excursion provider",
  OTHER: "Travel business",
};

const ACTIVITY_LABELS: Record<string, string> = {
  "company.profile.update": "Company profile updated",
  "company.tour.create": "Tour created",
  "company.tour.update": "Tour updated",
  "company.tour.archive": "Tour archived",
  "company.booking.status": "Booking status updated",
};

type RecentBooking = {
  id: number;
  reference: string | null;
  full_name: string;
  travelers: number;
  travel_date: string | null;
  status: "pending" | "confirmed" | "cancelled";
  tour_title: string | null;
  total_price: number | null;
};

type RecentTour = {
  id: number;
  title: string;
  publication_status: string;
  available: boolean;
  bookings_count: number | null;
};

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  created_at: string | null;
};

type DashboardStatTone =
  | "general"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "published"
  | "neutral";

function formatDate(value: string | null | undefined, withYear = true) {
  if (!value) return "Not set";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  });
}

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "No price";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function bookingBadgeClass(status: string) {
  if (status === "confirmed") return `${styles.badge} ${styles.badgeConfirmed}`;
  if (status === "cancelled") return `${styles.badge} ${styles.badgeCancelled}`;
  return `${styles.badge} ${styles.badgePending}`;
}

function tourBadgeClass(status: string) {
  if (status === "PUBLISHED") return `${styles.badge} ${styles.badgePublished}`;
  if (status === "PENDING_REVIEW") return `${styles.badge} ${styles.badgeReview}`;
  if (status === "REJECTED" || status === "ARCHIVED") {
    return `${styles.badge} ${styles.badgeArchived}`;
  }
  return `${styles.badge} ${styles.badgeDraft}`;
}

export default function CompanyWorkspacePage({
  context,
  companies,
  data,
}: {
  context: CompanyContext;
  companies: CompanySwitcherOption[];
  data: CompanyDashboardData;
}) {
  const can = (permission: string) =>
    context.permissions.includes(permission as never);
  const logoUrl = publicImageUrl(context.company.logoImageKey);
  const location = [
    context.company.locality,
    context.company.district,
    context.company.region,
  ]
    .filter(Boolean)
    .join(", ");
  const recentBookings = data.recent_bookings as unknown as RecentBooking[];
  const recentTours = data.recent_tours as unknown as RecentTour[];
  const notifications = data.notifications as unknown as NotificationItem[];
  const upcomingBookings = data.upcoming.reduce(
    (total, item) => total + item.bookings,
    0,
  );
  const upcomingTravelers = data.upcoming.reduce(
    (total, item) => total + item.travelers,
    0,
  );

  return (
    <div className={`page ${styles.dashboardRoot} ${styles.pageStack}`}>
      <div className={styles.pageHead}>
        <div className={styles.pageTitleWrap}>
          <p className={styles.eyebrow}>Company workspace</p>
          <h1 className={styles.pageTitle}>Operations overview</h1>
          <p className={styles.pageLead}>
            Keep bookings, tours and the operational profile for{" "}
            {context.company.name} in one place. Every number here is scoped to
            your active company.
          </p>
        </div>
        <div className={styles.pageActions}>
          {can("tours:write") && (
            <Link className="btn btn-primary" href="/company/tours/create/">
              <Plus size={16} /> New tour
            </Link>
          )}
          <Link className="btn btn-outline" href="/company/bookings/">
            <ClipboardList size={16} /> All bookings
          </Link>
        </div>
      </div>

      {companies.length > 1 && (
        <CompanySwitcher
          companies={companies}
          activeCompanyId={context.company.id}
        />
      )}

      <section className={`glass-card ${styles.hero}`}>
        <div className={styles.heroMain}>
          <div className={styles.logoRow}>
            <span className={styles.shellLogo}>
              {logoUrl ? (
                <Image src={logoUrl} alt="" width={40} height={40} />
              ) : (
                <Building2 size={20} />
              )}
            </span>
            <div>
              <h2 className={styles.heroTitle}>{context.company.name}</h2>
              <p className={styles.detailSub}>@{context.company.slug}</p>
            </div>
          </div>
          <p className={styles.heroCopy}>
            {context.company.description ||
              "Your company profile is ready. Add a description from the company profile page so customers know what you offer."}
          </p>
          <div className={styles.metaRow}>
            <span
              className={`${styles.pill} ${
                context.company.status === "ACTIVE" ? styles.activePill : ""
              }`}
            >
              <Shield size={13} />
              {STATUS_LABELS[context.company.status] ?? context.company.status}
            </span>
            <span className={styles.pill}>
              <Building2 size={13} />
              {BUSINESS_LABELS[context.company.businessType] ??
                context.company.businessType}
            </span>
            {location && (
              <span className={styles.pill}>
                <MapPin size={13} /> {location}
              </span>
            )}
            <span className={styles.pill}>
              <Users size={13} /> {COMPANY_ROLE_LABELS[context.role]}
            </span>
          </div>
          <div className={styles.quickActions} style={{ marginTop: 16 }}>
            {can("profile:update") && (
              <Link className="btn btn-outline btn-sm" href="/company/profile/">
                Edit company profile
              </Link>
            )}
            {can("analytics:read") && (
              <Link
                className="btn btn-ghost btn-sm"
                href="/company/analytics/"
              >
                <BarChart3 size={15} /> View analytics
              </Link>
            )}
          </div>
        </div>
        <aside className={styles.heroAside}>
          <div>
            <p className={styles.asideLabel}>Next 30 days</p>
            <p className={styles.asideValue}>{upcomingBookings} bookings</p>
            <p className={styles.asideCopy}>
              {upcomingTravelers} travelers across upcoming travel dates.
            </p>
          </div>
          <Link className="btn btn-outline btn-sm" href="/company/bookings/">
            Review schedule <ArrowRight size={14} />
          </Link>
        </aside>
      </section>

      <CompanyDashboardCharts stats={data.stats} upcoming={data.upcoming} />

      <div className={styles.dashboardGrid}>
        <div className={styles.detailStack}>
          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Recent bookings</h2>
                <p className={styles.panelCopy}>
                  Latest operational activity from your booking queue.
                </p>
              </div>
              <Link className={styles.panelLink} href="/company/bookings/">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {recentBookings.length === 0 ? (
              <p className={styles.emptyInline}>No company bookings yet.</p>
            ) : (
              <ul className={styles.list}>
                {recentBookings.map((booking) => (
                  <li className={styles.listItem} key={booking.id}>
                    <div className={styles.listMain}>
                      <Link
                        className={styles.listTitle}
                        href={`/company/bookings/${booking.id}/`}
                      >
                        {booking.reference || `Booking ${booking.id}`}
                      </Link>
                      <span className={styles.listSub}>
                        {booking.full_name} · {booking.tour_title || "Tour"}
                      </span>
                    </div>
                    <div>
                      <span className={bookingBadgeClass(booking.status)}>
                        {booking.status}
                      </span>
                      <span className={styles.listSub}>
                        {formatDate(booking.travel_date)} ·{" "}
                        {formatPrice(booking.total_price)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>


          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Upcoming travel dates</h2>
                <p className={styles.panelCopy}>
                  Confirmed and pending travel in the next 30 days.
                </p>
              </div>
              <Link className={styles.panelLink} href="/company/bookings/">
                Schedule <ArrowRight size={14} />
              </Link>
            </div>
            {data.upcoming.length === 0 ? (
              <p className={styles.emptyInline}>
                No upcoming travel dates in the next 30 days.
              </p>
            ) : (
              <ul className={styles.list}>
                {data.upcoming.map((item) => (
                  <li className={styles.listItem} key={item.date}>
                    <div className={styles.listMain}>
                      <span className={styles.listTitle}>
                        {formatDate(item.date)}
                      </span>
                      <span className={styles.listSub}>
                        {item.bookings} booking
                        {item.bookings === 1 ? "" : "s"} on this date
                      </span>
                    </div>
                    <span className={styles.listMeta}>
                      {item.travelers} travelers
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Recent tours</h2>
                <p className={styles.panelCopy}>
                  Publication state and booking interest for your catalogue.
                </p>
              </div>
              <Link className={styles.panelLink} href="/company/tours/">
                Manage tours <ArrowRight size={14} />
              </Link>
            </div>
            {recentTours.length === 0 ? (
              <p className={styles.emptyInline}>No tours have been created yet.</p>
            ) : (
              <ul className={styles.list}>
                {recentTours.map((tour) => (
                  <li className={styles.listItem} key={tour.id}>
                    <div className={styles.listMain}>
                      <Link
                        className={styles.listTitle}
                        href={`/company/tours/${tour.id}/`}
                      >
                        {tour.title}
                      </Link>
                      <span className={styles.listSub}>
                        {tour.bookings_count ?? 0} bookings ·{" "}
                        {tour.available ? "Available" : "Not bookable"}
                      </span>
                    </div>
                    <span className={tourBadgeClass(tour.publication_status)}>
                      {tour.publication_status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className={styles.detailStack}>
          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Notifications</h2>
                <p className={styles.panelCopy}>
                  Company-relevant updates only.
                </p>
              </div>
            </div>
            {notifications.length === 0 ? (
              <p className={styles.emptyInline}>
                No new company notifications.
              </p>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div className={styles.notificationItem} key={notification.id}>
                    <span
                      className={`${styles.notificationDot} ${
                        notification.read
                          ? styles.notificationRead
                          : styles.notificationUnread
                      }`}
                      role="img"
                      aria-label={notification.read ? "Read" : "Unread"}
                    />
                    {notification.url ? (
                      <Link
                        className={styles.notificationBody}
                        href={notification.url}
                      >
                        <span className={styles.notificationTitle}>
                          {notification.title}
                        </span>
                        <span className={styles.notificationCopy}>
                          {notification.body}
                        </span>
                        <span className={styles.notificationTime}>
                          <Clock size={11} />{" "}
                          {formatDate(notification.created_at)}
                        </span>
                      </Link>
                    ) : (
                      <div className={styles.notificationBody}>
                        <span className={styles.notificationTitle}>
                          {notification.title}
                        </span>
                        <span className={styles.notificationCopy}>
                          {notification.body}
                        </span>
                        <span className={styles.notificationTime}>
                          <Clock size={11} />{" "}
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Recent activity</h2>
                <p className={styles.panelCopy}>
                  Audited changes made in this workspace.
                </p>
              </div>
            </div>
            {data.recent_activity.length === 0 ? (
              <p className={styles.emptyInline}>No audited activity yet.</p>
            ) : (
              <ul className={styles.list}>
                {data.recent_activity.map((entry) => (
                  <li className={styles.listItem} key={entry.id}>
                    <div className={styles.listMain}>
                      <span className={styles.listTitle}>
                        {ACTIVITY_LABELS[entry.action] ??
                          entry.action.replace(/[._]/g, " ")}
                      </span>
                      <span className={styles.listSub}>
                        {entry.actor?.username
                          ? `By ${entry.actor.username}`
                          : "System"}{" "}
                        · {entry.entity}
                      </span>
                    </div>
                    <span className={styles.listMeta}>
                      {formatDate(entry.created_at, false)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>What this role can do</h2>
                <p className={styles.panelCopy}>
                  {COMPANY_ROLE_LABELS[context.role]} role at this company.
                </p>
              </div>
            </div>
            {context.permissions.length === 0 ? (
              <p className={styles.emptyInline}>
                No permissions are assigned to this workspace role.
              </p>
            ) : (
              <ul className={styles.list}>
                {context.permissions.slice(0, 6).map((permission) => (
                  <li className={styles.listItem} key={permission}>
                    <span className={styles.listSub}>
                      {COMPANY_PERMISSION_LABELS[permission]}
                    </span>
                    <CheckCircle size={15} aria-hidden="true" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import type { CompanyContext } from "@/lib/auth/company";
import type { CompanySwitcherOption } from "@/components/CompanySwitcher";
import CompanySwitcher from "@/components/CompanySwitcher";
import CompanyDashboardCharts from "@/features/pages/CompanyDashboardChartsClient";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  Globe,
  MapPin,
  MessageSquare,
  Plus,
  Shield,
  Users,
} from "@/components/icons";
import {
  COMPANY_PERMISSION_LABELS,
  COMPANY_ROLE_LABELS,
} from "@/lib/company-access";
import type { CompanyDashboardData } from "@/lib/services/company-workspace";
import { publicImageUrl } from "@/lib/storage/images";
import styles from "@/features/pages/company-dashboard.module.css";

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

function formatWeekday(value: string) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "No price";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function bookingBadgeClass(status: string) {
  if (status === "confirmed") return `${styles.dashBadge} ${styles.dashBadgeOk}`;
  if (status === "cancelled") {
    return `${styles.dashBadge} ${styles.dashBadgeDanger}`;
  }
  return `${styles.dashBadge} ${styles.dashBadgeWarn}`;
}

function tourBadgeClass(status: string) {
  if (status === "PUBLISHED") return `${styles.dashBadge} ${styles.dashBadgeOk}`;
  if (status === "PENDING_REVIEW") {
    return `${styles.dashBadge} ${styles.dashBadgeInfo}`;
  }
  if (status === "REJECTED" || status === "ARCHIVED") {
    return `${styles.dashBadge} ${styles.dashBadgeDanger}`;
  }
  return `${styles.dashBadge} ${styles.dashBadgeNeutral}`;
}

function PanelHead({
  icon,
  title,
  copy,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles.dashPanelHead}>
      <div className={styles.dashPanelHeadMain}>
        <span className={styles.dashPanelIcon} aria-hidden="true">
          {icon}
        </span>
        <div>
          <h2 className={styles.dashPanelTitle}>{title}</h2>
          <p className={styles.dashPanelCopy}>{copy}</p>
        </div>
      </div>
      {action}
    </div>
  );
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
  const peakUpcoming = Math.max(
    1,
    ...data.upcoming.map((item) => Math.max(item.bookings, item.travelers)),
  );

  return (
    <div className={styles.dashboardRoot}>
      <header className={styles.dashMasthead}>
        <div className={styles.dashMastheadText}>
          <p className={styles.dashEyebrow}>Company workspace</p>
          <h1 className={styles.dashTitle}>Operations overview</h1>
          <p className={styles.dashLead}>
            Keep bookings, tours and the operational profile for{" "}
            {context.company.name} in one place. Every number here is scoped to
            your active company.
          </p>
        </div>
        <div className={styles.dashActions}>
          {can("tours:write") && (
            <Link className="btn btn-primary" href="/company/tours/create/">
              <Plus size={16} /> New tour
            </Link>
          )}
          <Link className="btn btn-outline" href="/company/bookings/">
            <ClipboardList size={16} /> All bookings
          </Link>
        </div>
      </header>

      {companies.length > 1 && (
        <CompanySwitcher
          companies={companies}
          activeCompanyId={context.company.id}
        />
      )}

      <section className={styles.dashHero} aria-label="Company identity">
        <div className={styles.dashHeroMain}>
          <div className={styles.dashIdentity}>
            <span className={styles.dashLogo}>
              {logoUrl ? (
                <Image src={logoUrl} alt="" width={58} height={58} />
              ) : (
                <Building2 size={24} />
              )}
            </span>
            <div className={styles.dashIdentityText}>
              <h2 className={styles.dashName}>{context.company.name}</h2>
              <p className={styles.dashSlug}>@{context.company.slug}</p>
            </div>
            <span
              className={`${styles.dashPill} ${styles.dashPillOk} ${styles.dashIdentityPill}`}
            >
              <Shield size={13} />
              {STATUS_LABELS[context.company.status] ?? context.company.status}
            </span>
          </div>

          <p className={styles.dashCopy}>
            {context.company.description ||
              "Your company profile is ready. Add a description from the company profile page so customers know what you offer."}
          </p>

          <ul className={styles.dashMetaRow}>
            <li className={styles.dashPill}>
              <Building2 size={13} />
              {BUSINESS_LABELS[context.company.businessType] ??
                context.company.businessType}
            </li>
            {location && (
              <li className={styles.dashPill}>
                <MapPin size={13} /> {location}
              </li>
            )}
            <li className={styles.dashPill}>
              <Users size={13} /> {COMPANY_ROLE_LABELS[context.role]}
            </li>
          </ul>

          <div className={styles.dashActions}>
            {can("profile:update") && (
              <Link className="btn btn-outline btn-sm" href="/company/profile/">
                Edit company profile
              </Link>
            )}
            {can("analytics:read") && (
              <Link className="btn btn-ghost btn-sm" href="/company/analytics/">
                <BarChart3 size={15} /> View analytics
              </Link>
            )}
          </div>
        </div>

        <aside className={styles.dashAside}>
          <div className={styles.dashAsideMain}>
            <p className={styles.dashAsideLabel}>Next 30 days</p>
            <p className={styles.dashAsideValue}>{upcomingBookings} bookings</p>
            <p className={styles.dashAsideCopy}>
              {upcomingTravelers} travelers across upcoming travel dates.
            </p>
          </div>
          <Link className={styles.dashAsideCta} href="/company/bookings/">
            Review schedule <ArrowRight size={14} />
          </Link>
        </aside>
      </section>

      <section className={styles.dashPanel}>
        <PanelHead
          icon={<CalendarDays size={17} />}
          title="Upcoming travel dates"
          copy="Confirmed and pending travel in the next 30 days."
          action={
            <Link className={styles.dashPanelLink} href="/company/bookings/">
              Schedule <ArrowRight size={13} />
            </Link>
          }
        />
        {data.upcoming.length === 0 ? (
          <p className={styles.dashEmpty}>
            No upcoming travel dates in the next 30 days.
          </p>
        ) : (
          <ul className={styles.dashDateStrip}>
            {data.upcoming.map((item) => (
              <li className={styles.dashDateChip} key={item.date}>
                <div className={styles.dashDateChipTop}>
                  <span className={styles.dashDateChipDay}>
                    {formatWeekday(item.date)}
                  </span>
                  <span className={`${styles.dashBadge} ${styles.dashBadgeInfo}`}>
                    {item.bookings} booking{item.bookings === 1 ? "" : "s"}
                  </span>
                </div>
                <span className={styles.dashDateChipDate}>
                  {formatDate(item.date)}
                </span>
                <span className={styles.dashDateChipMeta}>
                  {item.travelers} traveler{item.travelers === 1 ? "" : "s"}
                </span>
                <div className={styles.dashDateChipBar}>
                  <span
                    style={{
                      width: `${Math.round(
                        (Math.max(item.bookings, item.travelers) /
                          peakUpcoming) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CompanyDashboardCharts stats={data.stats} upcoming={data.upcoming} />

      <div className={styles.dashGrid}>
        <div className={styles.dashStack}>
          <section className={styles.dashPanel}>
            <PanelHead
              icon={<ClipboardList size={17} />}
              title="Recent bookings"
              copy="Latest operational activity from your booking queue."
              action={
                <Link className={styles.dashPanelLink} href="/company/bookings/">
                  View all <ArrowRight size={13} />
                </Link>
              }
            />
            {recentBookings.length === 0 ? (
              <p className={styles.dashEmpty}>No company bookings yet.</p>
            ) : (
              <ul className={styles.dashList}>
                {recentBookings.map((booking) => (
                  <li className={styles.dashRow} key={booking.id}>
                    <div className={styles.dashRowMain}>
                      <Link
                        className={styles.dashRowTitle}
                        href={`/company/bookings/${booking.id}/`}
                      >
                        {booking.reference || `Booking ${booking.id}`}
                      </Link>
                      <span className={styles.dashRowSub}>
                        {booking.full_name} · {booking.tour_title || "Tour"}
                      </span>
                    </div>
                    <div className={styles.dashRowEnd}>
                      <span className={bookingBadgeClass(booking.status)}>
                        {booking.status.replace("_", " ")}
                      </span>
                      <span className={styles.dashRowMeta}>
                        {formatDate(booking.travel_date)} ·{" "}
                        {formatPrice(booking.total_price)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.dashPanel}>
            <PanelHead
              icon={<Globe size={17} />}
              title="Recent tours"
              copy="Publication state and booking interest for your catalogue."
              action={
                <Link className={styles.dashPanelLink} href="/company/tours/">
                  Manage tours <ArrowRight size={13} />
                </Link>
              }
            />
            {recentTours.length === 0 ? (
              <p className={styles.dashEmpty}>
                No tours have been created yet.
              </p>
            ) : (
              <ul className={styles.dashList}>
                {recentTours.map((tour) => (
                  <li className={styles.dashRow} key={tour.id}>
                    <div className={styles.dashRowMain}>
                      <Link
                        className={styles.dashRowTitle}
                        href={`/company/tours/${tour.id}/`}
                      >
                        {tour.title}
                      </Link>
                      <span className={styles.dashRowSub}>
                        {tour.bookings_count ?? 0} bookings ·{" "}
                        {tour.available ? "Available" : "Not bookable"}
                      </span>
                    </div>
                    <span className={tourBadgeClass(tour.publication_status)}>
                      {tour.publication_status.toLowerCase().replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className={styles.dashStack}>
          <section className={styles.dashPanel}>
            <PanelHead
              icon={<MessageSquare size={17} />}
              title="Notifications"
              copy="Company-relevant updates only."
            />
            {notifications.length === 0 ? (
              <p className={styles.dashEmpty}>
                No new company notifications.
              </p>
            ) : (
              <ul className={styles.dashNotifList}>
                {notifications.map((notification) => {
                  const unread = !notification.read;
                  const body = (
                    <>
                      <span className={styles.dashNotifTitle}>
                        {notification.title}
                      </span>
                      <span className={styles.dashNotifCopy}>
                        {notification.body}
                      </span>
                      <span className={styles.dashNotifTime}>
                        <CalendarDays size={11} />{" "}
                        {formatDate(notification.created_at)}
                      </span>
                    </>
                  );

                  return (
                    <li
                      className={`${styles.dashNotif} ${
                        unread ? styles.dashNotifUnread : ""
                      }`}
                      key={notification.id}
                    >
                      <span
                        className={`${styles.dashNotifDot} ${
                          unread ? styles.dashNotifDotUnread : ""
                        }`}
                        role="img"
                        aria-label={unread ? "Unread" : "Read"}
                      />
                      {notification.url ? (
                        <Link
                          className={styles.dashNotifBody}
                          href={notification.url}
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className={styles.dashNotifBody}>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={styles.dashPanel}>
            <PanelHead
              icon={<Activity size={17} />}
              title="Recent activity"
              copy="Audited changes made in this workspace."
            />
            {data.recent_activity.length === 0 ? (
              <p className={styles.dashEmpty}>No audited activity yet.</p>
            ) : (
              <ul className={styles.dashTimeline}>
                {data.recent_activity.map((entry) => (
                  <li className={styles.dashTimelineItem} key={entry.id}>
                    <span className={styles.dashTimelineDot} aria-hidden="true" />
                    <div className={styles.dashTimelineBody}>
                      <div>
                        <p className={styles.dashTimelineTitle}>
                          {ACTIVITY_LABELS[entry.action] ??
                            entry.action.replace(/[._]/g, " ")}
                        </p>
                        <p className={styles.dashTimelineMeta}>
                          {entry.actor?.username
                            ? `By ${entry.actor.username}`
                            : "System"}{" "}
                          · {entry.entity}
                        </p>
                      </div>
                      <span className={styles.dashTimelineDate}>
                        {formatDate(entry.created_at, false)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.dashPanel}>
            <PanelHead
              icon={<Shield size={17} />}
              title="What this role can do"
              copy={`${COMPANY_ROLE_LABELS[context.role]} role at this company.`}
            />
            {context.permissions.length === 0 ? (
              <p className={styles.dashEmpty}>
                No permissions are assigned to this workspace role.
              </p>
            ) : (
              <>
                <ul className={styles.dashPermGrid}>
                  {context.permissions.slice(0, 6).map((permission) => (
                    <li className={styles.dashPermChip} key={permission}>
                      <CheckCircle size={14} aria-hidden="true" />
                      {COMPANY_PERMISSION_LABELS[permission]}
                    </li>
                  ))}
                </ul>
                {context.permissions.length > 6 && (
                  <p className={styles.dashPermMore}>
                    +{context.permissions.length - 6} more permissions for this
                    role
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

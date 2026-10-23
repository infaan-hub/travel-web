"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminAPI, companiesAPI } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ToastProvider";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle,
  Clock,
  ExternalLink,
  EyeOff,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "@/components/icons";
import { getImageUrl } from "@/lib/utils/image-url";
import { hasCompleteCoordinates, openStreetMapUrl } from "@/lib/company-domain";
import { openingHoursEntries } from "@/lib/company-opening-hours";
import CompanyForm from "@/features/pages/CompanyForm";
import type {
  Company,
  CompanyAuditEntry,
  CompanyRole,
  CompanyStatus,
  Customer,
} from "@/features/pages/types";
import type { CompanyLifecycleAction } from "@/lib/company-domain";
import styles from "@/features/pages/admin-companies.module.css";

const STATUS_LABELS: Record<CompanyStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  ARCHIVED: "Archived",
};

const STATUS_CLASSES: Record<CompanyStatus, string> = {
  PENDING: styles.statusPending,
  ACTIVE: styles.statusActive,
  SUSPENDED: styles.statusSuspended,
  ARCHIVED: styles.statusArchived,
};

const ROLE_LABELS: Record<CompanyRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

const LIFECYCLE_LABELS: Record<CompanyLifecycleAction, string> = {
  activate: "Activate",
  suspend: "Suspend",
  reactivate: "Reactivate",
  archive: "Archive",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readApiError(caught: unknown, fallback: string) {
  const error = caught as { response?: { data?: { message?: string } } };
  return error.response?.data?.message || fallback;
}

function lifecycleActions(status: CompanyStatus): CompanyLifecycleAction[] {
  if (status === "PENDING") return ["activate", "archive"];
  if (status === "ACTIVE") return ["suspend", "archive"];
  if (status === "SUSPENDED") return ["reactivate", "archive"];
  return [];
}

function lifecycleIcon(action: CompanyLifecycleAction) {
  if (action === "activate") return <CheckCircle size={15} />;
  if (action === "suspend") return <EyeOff size={15} />;
  if (action === "reactivate") return <RefreshCw size={15} />;
  return <XCircle size={15} />;
}

function auditSummary(log: CompanyAuditEntry) {
  if (log.after && typeof log.after === "object") {
    const after = log.after as Record<string, unknown>;
    if (typeof after.role === "string") return `role: ${String(after.role).toLowerCase()}`;
    if (typeof after.status === "string" && !after.name) {
      return `status: ${String(after.status).toLowerCase()}`;
    }
    if (typeof after.slug === "string") return `slug: ${after.slug}`;
    if (typeof after.name === "string") return `company: ${after.name}`;
  }
  if (log.before && typeof log.before === "object") {
    const before = log.before as Record<string, unknown>;
    if (typeof before.role === "string") return `role: ${String(before.role).toLowerCase()}`;
    if (typeof before.status === "string") return `status: ${String(before.status).toLowerCase()}`;
  }
  return log.entity;
}

export default function AdminCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const companyId = Number(params?.id);
  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState<CompanyLifecycleAction | null>(null);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<CompanyRole>("MANAGER");
  const [memberBusy, setMemberBusy] = useState<number | null>(null);
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) {
      router.push("/admin/login");
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const loadCompany = useCallback(
    async (showLoading = true) => {
      if (!Number.isInteger(companyId) || companyId <= 0) {
        setError("Invalid company id.");
        setLoading(false);
        return;
      }
      if (showLoading) setLoading(true);
      try {
        const response = await companiesAPI.get(companyId);
        setCompany(response.data as Company);
        setError(null);
      } catch (caught) {
        setError(readApiError(caught, "This company could not be loaded."));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [companyId],
  );

  useEffect(() => {
    if (authLoading || !isAuthenticated || !isAdmin) return;
    const timer = window.setTimeout(() => {
      void loadCompany();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, isAuthenticated, isAdmin, loadCompany]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !isAdmin) return;
    adminAPI
      .getAllUsers()
      .then((response) => setUsers((response.data ?? []) as Customer[]))
      .catch(() => setUsers([]));
  }, [authLoading, isAuthenticated, isAdmin]);

  const handleLifecycle = async (action: CompanyLifecycleAction) => {
    if (!company) return;
    if (
      action === "archive" &&
      !window.confirm(
        "Archive this company? Tours and bookings are retained, but the company can no longer be public or receive members.",
      )
    ) {
      return;
    }
    if (
      action === "suspend" &&
      !window.confirm("Suspend this company? Its public profile will be removed.")
    ) {
      return;
    }
    setLifecycleBusy(action);
    try {
      const response = await companiesAPI.transition(company.id, action);
      setCompany(response.data as Company);
      toast.success(
        action === "activate"
          ? "Company activated. Review its details, then make it public when ready."
          : action === "suspend"
            ? "Company suspended and removed from public view."
            : action === "reactivate"
              ? "Company reactivated. It remains private until you publish it."
              : "Company archived. Historical bookings were retained.",
      );
    } catch (caught) {
      toast.error(readApiError(caught, `Could not ${action} this company.`));
    } finally {
      setLifecycleBusy(null);
    }
  };

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company || !memberUserId) {
      toast.error("Select a user to assign.");
      return;
    }
    setAddingMember(true);
    try {
      await companiesAPI.addMember(company.id, {
        user_id: Number(memberUserId),
        role: memberRole,
      });
      setMemberUserId("");
      await loadCompany(false);
      toast.success("Membership assigned.");
    } catch (caught) {
      toast.error(readApiError(caught, "Could not assign this membership."));
    } finally {
      setAddingMember(false);
    }
  };

  const handleRoleChange = async (membershipId: number, role: CompanyRole) => {
    if (!company) return;
    setMemberBusy(membershipId);
    try {
      await companiesAPI.updateMember(company.id, membershipId, role);
      await loadCompany(false);
      toast.success("Member role updated.");
    } catch (caught) {
      toast.error(readApiError(caught, "Could not update this role."));
    } finally {
      setMemberBusy(null);
    }
  };

  const handleRevoke = async (membershipId: number, username: string) => {
    if (!company) return;
    if (!window.confirm(`Revoke ${username}'s access to this company?`)) return;
    setMemberBusy(membershipId);
    try {
      await companiesAPI.revokeMember(company.id, membershipId);
      await loadCompany(false);
      toast.success("Membership revoked.");
    } catch (caught) {
      toast.error(readApiError(caught, "Could not revoke this membership."));
    } finally {
      setMemberBusy(null);
    }
  };

  if (authLoading) {
    return (
      <div className="page">
        <div className="loading">Checking access…</div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) return null;

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading company…</div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="page admin-page">
        <Link href="/admin/companies" className="btn btn-outline btn-back">
          <ArrowLeft size={16} /> Back to companies
        </Link>
        <div className="admin-content">
          <div className="empty-state">
            <AlertCircle size={36} />
            <h3>Company unavailable</h3>
            <p>{error ?? "This company could not be found."}</p>
            <button type="button" className="btn btn-outline" onClick={() => loadCompany()}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const companyHours = openingHoursEntries(company.opening_hours);
  const stats = company.stats;
  const activeMembers = (company.members ?? []).filter((member) => member.status === "ACTIVE");
  const revokedMembers = (company.members ?? []).filter(
    (member) => member.status === "REVOKED",
  );
  const activeMemberIds = new Set(activeMembers.map((member) => member.user.id));
  const availableUsers = users.filter((user) => !activeMemberIds.has(user.id));
  const hasCoordinates = hasCompleteCoordinates(company.latitude, company.longitude);
  const actions = lifecycleActions(company.status);
  const canAddMembers = company.status !== "ARCHIVED";

  return (
    <div className="page admin-page">
      <Link href="/admin/companies" className="btn btn-outline btn-back">
        <ArrowLeft size={16} /> Back to companies
      </Link>

      <div className={styles.detailHeader}>
        <div className={styles.detailIdentity}>
          {company.logo_image_url ? (
            <Image
              src={getImageUrl(company.logo_image_url)}
              alt=""
              width={76}
              height={76}
              className={styles.detailLogo}
            />
          ) : (
            <span className={styles.detailLogoFallback} aria-hidden="true">
              <Building2 size={32} />
            </span>
          )}
          <div>
            <div className={styles.badgeRow}>
              <span className={`role-badge ${STATUS_CLASSES[company.status]}`}>
                {STATUS_LABELS[company.status]}
              </span>
              <span
                className={`role-badge ${
                  company.is_public ? styles.publicBadge : styles.privateBadge
                }`}
              >
                {company.is_public ? "Public" : "Private"}
              </span>
            </div>
            <h1>{company.name}</h1>
            <p className={styles.detailSubtitle}>
              /{company.slug} · {company.business_type.replaceAll("_", " ").toLowerCase()}
              {company.region ? ` · ${company.region}` : ""}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          {company.is_public && (
            <a
              href={company.public_path}
              className="btn btn-outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={16} /> Public profile
            </a>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setEditing((value) => !value)}
            aria-expanded={editing}
          >
            <Pencil size={16} /> {editing ? "Close editor" : "Edit details"}
          </button>
        </div>
      </div>

      {editing && (
        <section className="admin-content" aria-label="Edit company details">
          <div className={styles.panelHeader}>
            <div>
              <h2>Edit company details</h2>
              <p>Changes are audited and take effect immediately.</p>
            </div>
          </div>
          <CompanyForm
            company={company}
            onSaved={(updated) => {
              setCompany(updated);
              setEditing(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onCancel={() => setEditing(false)}
          />
        </section>
      )}

      {stats && (
        <div className="dashboard-stats-grid">
          <div className="dashboard-stat-card">
            <div className="stat-icon">
              <Globe size={20} />
            </div>
            <div className="stat-value">{stats.tours_total}</div>
            <div className="stat-label">Tours</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="stat-icon">
              <CheckCircle size={20} />
            </div>
            <div className="stat-value">{stats.tours_published}</div>
            <div className="stat-label">Published tours</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="stat-icon">
              <Clock size={20} />
            </div>
            <div className="stat-value">{stats.bookings_pending}</div>
            <div className="stat-label">Pending bookings</div>
          </div>
          <div className="dashboard-stat-card confirmed">
            <div className="stat-icon">
              <CheckCircle size={20} />
            </div>
            <div className="stat-value">{stats.bookings_confirmed}</div>
            <div className="stat-label">Confirmed bookings</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="stat-icon">
              <Users size={20} />
            </div>
            <div className="stat-value">{stats.members_active}</div>
            <div className="stat-label">Active members</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="stat-icon">
              <Shield size={20} />
            </div>
            <div className="stat-value">{stats.bookings_total}</div>
            <div className="stat-label">Bookings retained</div>
          </div>
        </div>
      )}

      <div className={styles.detailGrid}>
        <div className={styles.detailMain}>
          <section className="admin-content">
            <div className={styles.panelHeader}>
              <div>
                <h2>Profile</h2>
                <p>Public identity and contact details.</p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setEditing(true)}
              >
                <Pencil size={14} /> Edit
              </button>
            </div>
            <p className={styles.description}>
              {company.description || "No description has been added yet."}
            </p>
            <dl className={styles.overviewGrid}>
              <div className={styles.overviewItem}>
                <dt>Contact email</dt>
                <dd>
                  {company.contact_email ? (
                    <a href={`mailto:${company.contact_email}`}>
                      <Mail size={14} /> {company.contact_email}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className={styles.overviewItem}>
                <dt>Contact phone</dt>
                <dd>
                  {company.contact_phone ? (
                    <a href={`tel:${company.contact_phone}`}>
                      <Phone size={14} /> {company.contact_phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className={styles.overviewItem}>
                <dt>Website</dt>
                <dd>
                  {company.website ? (
                    <a href={company.website} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} /> {company.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className={styles.overviewItem}>
                <dt>Registration reference</dt>
                <dd>{company.registration_reference || "—"}</dd>
              </div>
              <div className={`${styles.overviewItem} ${styles.overviewWide}`}>
                <dt>Address</dt>
                <dd>
                  <MapPin size={14} />{" "}
                  {[company.address, company.locality, company.district, company.region, company.country]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </dd>
              </div>
              <div className={styles.overviewItem}>
                <dt>Opening hours</dt>
                <dd>
                  {companyHours.length ? (
                    <ul>
                      {companyHours.map((entry) => (
                        <li key={entry.day}>
                          <strong>{entry.day}:</strong> {entry.hours}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className={styles.overviewItem}>
                <dt>Coordinates</dt>
                <dd>
                  {hasCoordinates ? (
                    <a
                      href={openStreetMapUrl(company.latitude as number, company.longitude as number)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin size={14} /> {company.latitude}, {company.longitude}
                    </a>
                  ) : (
                    "No coordinates set"
                  )}
                </dd>
              </div>
              <div className={styles.overviewItem}>
                <dt>Profile URL</dt>
                <dd className={styles.mono}>/{company.slug}</dd>
              </div>
              <div className={styles.overviewItem}>
                <dt>Created</dt>
                <dd>{formatDate(company.created_at)}</dd>
              </div>
              <div className={styles.overviewItem}>
                <dt>Last updated</dt>
                <dd>{formatDateTime(company.updated_at)}</dd>
              </div>
            </dl>
            {company.social_links && Object.keys(company.social_links).length > 0 && (
              <div className={styles.socialLinks}>
                {Object.entries(company.social_links)
                  .filter(([, value]) => Boolean(value))
                  .map(([network, value]) => (
                    <a key={network} href={value} target="_blank" rel="noopener noreferrer">
                      {network} <ExternalLink size={12} />
                    </a>
                  ))}
              </div>
            )}
          </section>

          <section className="admin-content">
            <div className={styles.panelHeader}>
              <div>
                <h2>Assigned tours</h2>
                <p>Recent non-deleted tours owned by this company.</p>
              </div>
              <span className={styles.panelMeta}>{stats?.tours_total ?? company.tours_count} total</span>
            </div>
            {company.tours && company.tours.length > 0 ? (
              <div className="admin-attractions-table">
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Tour</th>
                        <th scope="col">Publication</th>
                        <th scope="col">Availability</th>
                        <th scope="col">Bookings</th>
                        <th scope="col">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {company.tours.map((tour) => (
                        <tr key={tour.id}>
                          <td>
                            <Link href={`/tour/${tour.id}/`} className={styles.inlineLink}>
                              {tour.title}
                            </Link>
                            <span className={styles.tableSubtext}>{tour.destination}</span>
                          </td>
                          <td>{tour.publication_status.replaceAll("_", " ").toLowerCase()}</td>
                          <td>{tour.available ? "Available" : "Unavailable"}</td>
                          <td>{tour.bookings_count}</td>
                          <td>{formatDate(tour.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className={styles.emptyPanel}>
                <Globe size={24} />
                <p>No tours are assigned to this company yet.</p>
              </div>
            )}
          </section>

          <section className="admin-content">
            <div className={styles.panelHeader}>
              <div>
                <h2>Recent bookings</h2>
                <p>Bookings are historical records and are never removed by archiving.</p>
              </div>
              <span className={styles.panelMeta}>{stats?.bookings_total ?? company.bookings_count} total</span>
            </div>
            {company.bookings && company.bookings.length > 0 ? (
              <div className="admin-attractions-table">
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Reference</th>
                        <th scope="col">Guest</th>
                        <th scope="col">Tour</th>
                        <th scope="col">Travel date</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {company.bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td className={styles.mono}>{booking.reference || `#${booking.id}`}</td>
                          <td>
                            {booking.full_name}
                            <span className={styles.tableSubtext}>
                              {booking.travelers} traveler{booking.travelers === 1 ? "" : "s"}
                            </span>
                          </td>
                          <td>{booking.tour_title || "—"}</td>
                          <td>{formatDate(booking.travel_date)}</td>
                          <td>
                            <span className={`booking-status status-${booking.status}`}>
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className={styles.emptyPanel}>
                <Clock size={24} />
                <p>No bookings have been recorded for this company.</p>
              </div>
            )}
          </section>

          <section className="admin-content">
            <div className={styles.panelHeader}>
              <div>
                <h2>Recent audit</h2>
                <p>Privileged changes recorded against this company.</p>
              </div>
            </div>
            {company.recent_audit && company.recent_audit.length > 0 ? (
              <ul className={styles.auditList}>
                {company.recent_audit.map((log) => (
                  <li key={log.id} className={styles.auditRow}>
                    <div className={styles.auditIcon}>
                      <Shield size={14} />
                    </div>
                    <div className={styles.auditBody}>
                      <div className={styles.auditAction}>
                        {log.action.replaceAll(".", " · ")}
                      </div>
                      <div className={styles.auditMeta}>
                        {auditSummary(log)} · {log.actor?.username ?? "system"} ·{" "}
                        {formatDateTime(log.created_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyPanel}>
                <Shield size={24} />
                <p>No audit entries have been recorded for this company yet.</p>
              </div>
            )}
          </section>
        </div>

        <aside className={styles.detailSide}>
          <section className="admin-content">
            <div className={styles.panelHeader}>
              <div>
                <h2>Lifecycle</h2>
                <p>Status changes are explicit and audited.</p>
              </div>
            </div>
            <div className={styles.lifecycleStatus}>
              <span className={`role-badge ${STATUS_CLASSES[company.status]}`}>
                {STATUS_LABELS[company.status]}
              </span>
              <span>{company.is_public ? "Public profile is live" : "Private profile"}</span>
            </div>
            <dl className={styles.lifecycleDates}>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(company.created_at)}</dd>
              </div>
              <div>
                <dt>Suspended</dt>
                <dd>{formatDateTime(company.suspended_at)}</dd>
              </div>
              <div>
                <dt>Archived</dt>
                <dd>{formatDateTime(company.archived_at)}</dd>
              </div>
            </dl>
            {actions.length > 0 ? (
              <div className={styles.lifecycleActions}>
                {actions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className={`btn btn-sm ${
                      action === "archive"
                        ? "btn-danger"
                        : action === "activate" || action === "reactivate"
                          ? "btn-success"
                          : "btn-outline"
                    }`}
                    onClick={() => handleLifecycle(action)}
                    disabled={lifecycleBusy !== null}
                  >
                    {lifecycleIcon(action)}
                    {lifecycleBusy === action ? "Working…" : LIFECYCLE_LABELS[action]}
                  </button>
                ))}
              </div>
            ) : (
              <p className={styles.help}>
                Archived companies cannot be reactivated. Tours and bookings remain intact.
              </p>
            )}
            {company.status === "ACTIVE" && !company.is_public && (
              <p className={styles.inlineNote}>
                <EyeOff size={14} /> This company is active but private. Use Edit details to
                make the profile public.
              </p>
            )}
          </section>

          <section className="admin-content">
            <div className={styles.panelHeader}>
              <div>
                <h2>Members</h2>
                <p>Only platform administrators can assign or revoke access.</p>
              </div>
              <span className={styles.panelMeta}>{activeMembers.length} active</span>
            </div>

            {activeMembers.length > 0 ? (
              <ul className={styles.memberList}>
                {activeMembers.map((member) => (
                  <li key={member.id} className={styles.memberRow}>
                    {member.user.profile_image_url ? (
                      <Image
                        src={getImageUrl(member.user.profile_image_url)}
                        alt=""
                        width={40}
                        height={40}
                        className={styles.memberAvatar}
                      />
                    ) : (
                      <span className={styles.memberAvatarFallback} aria-hidden="true">
                        {member.user.full_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className={styles.memberIdentity}>
                      <strong>{member.user.full_name}</strong>
                      <span>{member.user.email || `@${member.user.username}`}</span>
                    </div>
                    <div className={styles.memberActions}>
                      <label className="sr-only" htmlFor={`role-${member.id}`}>
                        Role for {member.user.full_name}
                      </label>
                      <select
                        id={`role-${member.id}`}
                        value={member.role}
                        onChange={(event) =>
                          handleRoleChange(member.id, event.target.value as CompanyRole)
                        }
                        disabled={memberBusy !== null}
                      >
                        <option value="OWNER">Owner</option>
                        <option value="MANAGER">Manager</option>
                        <option value="STAFF">Staff</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRevoke(member.id, member.user.full_name)}
                        disabled={memberBusy !== null}
                        aria-label={`Revoke access for ${member.user.full_name}`}
                        title="Revoke access"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyPanel}>
                <Users size={24} />
                <p>No active members. Assign an owner or manager to delegate access.</p>
              </div>
            )}

            {canAddMembers && (
              <form className={styles.memberForm} onSubmit={handleAddMember}>
                <div className={styles.memberFormRow}>
                  <div className="form-group">
                    <label htmlFor="member-user">Add a user</label>
                    <select
                      id="member-user"
                      value={memberUserId}
                      onChange={(event) => setMemberUserId(event.target.value)}
                    >
                      <option value="">Select a user…</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username}
                          {user.email ? ` — ${user.email}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="member-role">Role</label>
                    <select
                      id="member-role"
                      value={memberRole}
                      onChange={(event) => setMemberRole(event.target.value as CompanyRole)}
                    >
                      <option value="OWNER">Owner</option>
                      <option value="MANAGER">Manager</option>
                      <option value="STAFF">Staff</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  disabled={addingMember || !memberUserId}
                >
                  <UserPlus size={14} /> {addingMember ? "Assigning…" : "Assign member"}
                </button>
              </form>
            )}

            {revokedMembers.length > 0 && (
              <details className={styles.revokedMembers}>
                <summary>{revokedMembers.length} revoked historic membership{revokedMembers.length === 1 ? "" : "s"}</summary>
                <ul>
                  {revokedMembers.map((member) => (
                    <li key={member.id}>
                      <span>{member.user.full_name}</span>
                      <span>
                        {ROLE_LABELS[member.role]} · revoked {formatDate(member.revoked_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

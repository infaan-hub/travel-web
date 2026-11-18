"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { companiesAPI } from "@/lib/api/client"
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
  XCircle,
} from "@/components/icons";
import { getImageUrl } from "@/lib/utils/image-url";
import { hasCompleteCoordinates, openStreetMapUrl } from "@/lib/company-domain";
import { openingHoursEntries } from "@/lib/company-opening-hours";
import CompanyForm from "@/features/pages/CompanyForm";
import type {
  Company,
  CompanyAuditEntry,
  CompanyStatus,
} from "@/features/pages/types";
import type { CompanyLifecycleAction } from "@/lib/company-domain";
import styles from "@/features/pages/admin-companies.module.css";

const STATUS_LABELS: Record<CompanyStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  ARCHIVED: "Archived",
  REJECTED: "Rejected",
};

const STATUS_CLASSES: Record<CompanyStatus, string> = {
  PENDING: styles.statusPending,
  ACTIVE: styles.statusActive,
  SUSPENDED: styles.statusSuspended,
  ARCHIVED: styles.statusArchived,
  REJECTED: styles.statusRejected,
};

const LIFECYCLE_LABELS: Record<CompanyLifecycleAction, string> = {
  activate: "Approve & publish",
  suspend: "Suspend",
  reactivate: "Reactivate",
  archive: "Archive",
  reject: "Reject company",
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
  if (status === "PENDING") return ["activate", "reject", "archive"];
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState<CompanyLifecycleAction | null>(null);
  const [deletingCompany, setDeletingCompany] = useState(false);
  const [accountForm, setAccountForm] = useState({ username: "", email: "", password: "" });
  const [creatingAccount, setCreatingAccount] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) {
      router.push("/login");
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

  const handleLifecycle = async (action: CompanyLifecycleAction) => {
    if (!company) return;
    if (
      action === "archive" &&
      !window.confirm(
        "Archive this company? Private hire services and bookings are retained, but the company can no longer be public.",
      )
    ) {
      return;
    }
    if (
      action === "reject" &&
      !window.confirm("Reject this company? The owner will be unable to use this company workspace.")
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
          ? "Company approved and published to tourists."
          : action === "suspend"
            ? "Company suspended and removed from public view."
            : action === "reject"
              ? "Company rejected."
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

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company) return;
    setCreatingAccount(true);
    try {
      await fetch(`/api/admin/companies/${company.id}/account/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_username: accountForm.username,
          owner_email: accountForm.email,
          owner_password: accountForm.password,
        }),
      }).then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Could not create company login.");
      });
      setAccountForm({ username: "", email: "", password: "" });
      await loadCompany(false);
      toast.success("Company login created.");
    } catch (caught) {
      toast.error(readApiError(caught, caught instanceof Error ? caught.message : "Could not create company login."));
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!company) return;
    const confirmed = window.confirm(
      `Permanently delete ${company.name}? This also deletes its private hire services, bookings, company login, company audit history, and images. This action cannot be undone.`,
    );
    if (!confirmed) return;
    setDeletingCompany(true);
    try {
      await companiesAPI.delete(company.id);
      toast.success("Company and its associated data permanently deleted.");
      router.push("/admin/companies");
    } catch (caught) {
      toast.error(readApiError(caught, "Could not delete this company."));
      setDeletingCompany(false);
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
  const hasCoordinates = hasCompleteCoordinates(company.latitude, company.longitude);
  const actions = lifecycleActions(company.status);

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
              /{company.slug}{company.region ? ` � ${company.region}` : ""}
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
            <div className="stat-label">Private Hire Services</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="stat-icon">
              <CheckCircle size={20} />
            </div>
            <div className="stat-value">{stats.tours_published}</div>
            <div className="stat-label">Published services</div>
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
                <h2>Assigned private hire services</h2>
                <p>Recent non-deleted private hire services owned by this company.</p>
              </div>
              <span className={styles.panelMeta}>{stats?.tours_total ?? company.tours_count} total</span>
            </div>
            {company.tours && company.tours.length > 0 ? (
              <div className="admin-attractions-table">
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Service</th>
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
                <p>No private hire services are assigned to this company yet.</p>
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
                        <th scope="col">Service</th>
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
                <h2>Company login</h2>
                <p>One sign-in with authority for this company only.</p>
              </div>
            </div>
            {company.account ? (
              <dl className={styles.lifecycleDates}>
                <div><dt>Username</dt><dd>{company.account.username}</dd></div>
                <div><dt>Email</dt><dd>{company.account.email}</dd></div>
              </dl>
            ) : (
              <form className={styles.companyAccountForm} onSubmit={handleCreateAccount}>
                <p className={styles.help}>No login is assigned. Create one for this company.</p>
                <div className="form-group">
                  <label htmlFor="company-account-username">Username</label>
                  <input id="company-account-username" value={accountForm.username} onChange={(event) => setAccountForm((v) => ({ ...v, username: event.target.value }))} required minLength={3} autoComplete="off" />
                </div>
                <div className="form-group">
                  <label htmlFor="company-account-email">Email</label>
                  <input id="company-account-email" type="email" value={accountForm.email} onChange={(event) => setAccountForm((v) => ({ ...v, email: event.target.value }))} required autoComplete="off" />
                </div>
                <div className="form-group">
                  <label htmlFor="company-account-password">Temporary password</label>
                  <input id="company-account-password" type="password" value={accountForm.password} onChange={(event) => setAccountForm((v) => ({ ...v, password: event.target.value }))} required minLength={8} autoComplete="new-password" />
                </div>
                <button className="btn btn-primary" disabled={creatingAccount}>
                  {creatingAccount ? "Creating login�" : "Create company login"}
                </button>
              </form>
            )}
          </section>

          <section className="admin-content">
            <div className={styles.panelHeader}>
              <div>
                <h2>Lifecycle</h2>
                <p>Status changes are explicit and audited. Deletion permanently removes company data.</p>
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
                      action === "archive" || action === "reject"
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
                Archived companies cannot be reactivated. Private hire services and bookings remain intact.
              </p>
            )}
            {company.status === "ACTIVE" && !company.is_public && (
              <p className={styles.inlineNote}>
                <EyeOff size={14} /> This company is active but private. Use Edit details to
                make the profile public.
              </p>
            )}
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={handleDeleteCompany}
              disabled={deletingCompany || lifecycleBusy !== null}
            >
              <Trash2 size={14} />
              {deletingCompany ? "Deleting company…" : "Delete company permanently"}
            </button>
          </section>


        </aside>
      </div>
    </div>
  );
}

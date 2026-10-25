"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { adminAPI, companiesAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { Users, UserX, Shield, User, ChevronLeft, ChevronRight } from '@/components/icons';

import { useToast } from "@/components/ToastProvider";

import styles from "@/features/pages/admin-dashboard.module.css";
import type { Company, Customer } from "@/features/pages/types";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
export default function AdminCustomersPage() {
  const toast = useToast();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySelections, setCompanySelections] = useState<Record<number, string>>({});
  const [assigningUserId, setAssigningUserId] = useState<number | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [pendingResets, setPendingResets] = useState<Customer[]>([]);
  const perPage = 10;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/login'); return; }
    Promise.all([adminAPI.getAllUsers(), companiesAPI.list()])
      .then(([userResponse, companyResponse]) => {
        setUsers((userResponse.data.results || userResponse.data) as Customer[]);
        const companyData = companyResponse.data;
        setCompanies(
          (Array.isArray(companyData) ? companyData : companyData.results ?? []) as Company[],
        );
      })
      .catch(() => toast.error('Failed to load users and company assignments'))
      .finally(() => setLoading(false));
    loadPendingResets();
  }, [authLoading, isAuthenticated, isAdmin, router, toast]);

  const loadPendingResets = async () => {
    try {
      const response = await fetch('/api/auth/password-reset/pending/', { credentials: 'include' });
      const payload = await response.json();
      if (response.ok) setPendingResets(payload.resets || []);
    } catch {
      // Non critical panel.
    }
  };

  const issueCode = async (user: Customer, purpose: any) => {
    try {
      const endpoint = purpose === 'reset'
        ? '/api/auth/password-reset/issue/'
        : '/api/auth/email-verification/issue/';
      const body = purpose === 'reset' ? { user_id: user.id } : { user_id: user.id };
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Failed to create the code');
      setCodes((current: any) => ({ ...current, [`${purpose}-${user.id}`]: payload.code }));
      toast.success(`Code for ${user.username}: ${payload.code}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to create the code');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await adminAPI.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
    } catch { toast.error('Failed to delete user'); }
  };

  const handleAssignCompany = async (userId: number) => {
    const companyId = Number(companySelections[userId]);
    if (!companyId) {
      toast.error('Select a company first');
      return;
    }
    setAssigningUserId(userId);
    try {
      await companiesAPI.addMember(companyId, { user_id: userId, role: 'MANAGER' });
      const response = await adminAPI.getAllUsers();
      setUsers((response.data.results || response.data) as Customer[]);
      setCompanySelections((current) => ({ ...current, [userId]: '' }));
      toast.success('Company assigned to user');
    } catch {
      toast.error('Failed to assign company');
    } finally {
      setAssigningUserId(null);
    }
  };

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className={styles.dashboardRoot}><div className="loading">Loading users...</div></div>;

  const totalPages = Math.ceil(users.length / perPage);
  const paged = users.slice((page - 1) * perPage, page * perPage);

  return (
    <div className={styles.dashboardRoot}>
      <header className={styles.dashMasthead}>
        <div className={styles.dashMastheadText}>
          <p className={styles.dashEyebrow}>Admin workspace</p>
          <h1 className={styles.dashTitle}><Users size={20} /> Users</h1>
          <p className={styles.dashLead}>Manage registered accounts and company assignments ({users.length} total)</p>
        </div>
        <div className={styles.dashActions}>
          <button className="btn btn-outline" onClick={() => router.push('/admin/dashboard')}>
            <ChevronLeft size={16} /> Back
          </button>
        </div>
      </header>

      <section className={styles.dashPanel} aria-label="Registered users">
        <div className={styles.dashPanelHead}>
          <div className={styles.dashPanelHeadMain}>
            <span className={styles.dashPanelIcon} aria-hidden="true">
              <Users size={17} />
            </span>
            <div>
              <h2 className={styles.dashPanelTitle}>Registered users ({users.length})</h2>
              <p className={styles.dashPanelCopy}>Customer, tour company, and admin accounts.</p>
            </div>
          </div>
        </div>
        <div className="admin-table-container">
          <div className="table-responsive"><table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Account type</th>
                <th>Companies</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={7} className="empty-cell">No users found</td></tr>
              ) : paged.map(u => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    {u.is_staff ? (
                      <span className="role-badge admin-role"><Shield size={12} /> Admin</span>
                    ) : u.account_type === "TOUR_COMPANY" ? (
                      <span className="role-badge customer-role">Tour company</span>
                    ) : (
                      <span className="role-badge customer-role"><User size={12} /> Customer</span>
                    )}
                  </td>
                  <td>
                    {u.companies?.length ? (
                      <div className="admin-actions">
                        {u.companies.map((company) => (
                          <Link
                            key={`${company.id}-${company.role}`}
                            href={`/admin/companies/${company.id}`}
                            className="btn btn-sm btn-outline"
                            title={`${company.role.replaceAll("_", " ")} · ${company.status.toLowerCase()}`}
                          >
                            {company.name} ({company.status.toLowerCase()})
                          </Link>
                        ))}
                      </div>
                    ) : null}
                    {!u.is_staff && (
                      <div className="admin-actions" style={{ marginTop: 6 }}>
                        <label className="sr-only" htmlFor={`company-${u.id}`}>
                          Company to assign to {u.username}
                        </label>
                        <select
                          id={`company-${u.id}`}
                          value={companySelections[u.id] ?? ''}
                          onChange={(event) =>
                            setCompanySelections((current) => ({
                              ...current,
                              [u.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Assign company…</option>
                          {companies
                            .filter(
                              (company) =>
                                company.status !== 'ARCHIVED' &&
                                !u.companies?.some(
                                  (membership) =>
                                    membership.id === company.id &&
                                    membership.status === 'ACTIVE',
                                ),
                            )
                            .map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          disabled={!companySelections[u.id] || assigningUserId === u.id}
                          onClick={() => handleAssignCompany(u.id)}
                        >
                          {assigningUserId === u.id ? 'Assigning…' : 'Assign'}
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`role-badge ${u.is_active === false ? "" : "customer-role"}`}>
                      {u.is_active === false ? "Inactive" : "Active"}
                    </span>
                    <span className="role-badge" style={{ marginLeft: 6, background: u.email_verified ? undefined : 'rgba(234,179,8,0.15)', color: u.email_verified ? undefined : '#92400e' }}>
                      {u.email_verified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      {!u.email_verified && (
                        <button className="btn btn-sm btn-outline" onClick={() => issueCode(u, 'verify')}>Verify code</button>
                      )}
                      <button className="btn btn-sm btn-outline" onClick={() => issueCode(u, 'reset')}>Reset code</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}><UserX size={14} /> Delete</button>
                    </div>
                    {codes[`reset-${u.id}`] ? <small className="code-hint">Reset code: {codes[`reset-${u.id}`]}</small> : null}
                    {codes[`verify-${u.id}`] ? <small className="code-hint">Verification code: {codes[`verify-${u.id}`]}</small> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </section>
      {pendingResets.length > 0 && (
        <section className={styles.dashPanel} aria-label="Pending password resets">
          <div className={styles.dashPanelHead}>
            <div className={styles.dashPanelHeadMain}>
              <span className={styles.dashPanelIcon} aria-hidden="true">
                <Shield size={17} />
              </span>
              <div>
                <h2 className={styles.dashPanelTitle}>Pending password resets</h2>
                <p className={styles.dashPanelCopy}>Accounts waiting for a reset code.</p>
              </div>
            </div>
          </div>
          <ul className="pending-list">
              {pendingResets.map((item: Customer) => (
                <li key={item.id}>
                  <strong>{item.username}</strong> · {item.email} · requested{' '}
                  {item.reset_requested_at ? new Date(item.reset_requested_at).toLocaleString() : ''}
                  <button className="btn btn-sm btn-outline" onClick={() => issueCode(item, 'reset')}>
                    Issue code
                  </button>
                </li>
              ))}
            </ul>
        </section>
      )}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-sm btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
            <span className="page-info">Page {page} of {totalPages}</span>
            <button className="btn btn-sm btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
          </div>
        )}
    </div>
  );
}
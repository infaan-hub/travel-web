"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { Users, UserX, Shield, User, Search, ChevronLeft, ChevronRight } from 'lucide-react';

import { useToast } from "@/components/ToastProvider";

import type {  Customer  } from "@/features/pages/types";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
export default function AdminCustomersPage() {
  const toast = useToast();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [pendingResets, setPendingResets] = useState<Customer[]>([]);
  const perPage = 10;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/admin/login'); return; }
    adminAPI.getAllUsers()
      .then(res => setUsers((res.data.results || res.data) as Customer[]))
      .catch(console.error)
      .finally(() => setLoading(false));
    loadPendingResets();
  }, [authLoading, isAuthenticated, isAdmin, router]);

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

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading customers...</div></div>;

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>Customers</h1>
        <p>Manage registered users ({users.length} total)</p>
      </div>

      <div className="admin-toolbar">
        <div className="search-input-group">
          <Search size={16} />
          <input type="text" placeholder="Search by name or email..." value={search} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-bookings-table">
          <div className="table-responsive"><table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="empty-cell">No customers found</td></tr>
              ) : paged.map(u => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.email}</td>
                  <td>{u.is_staff ? <span className="role-badge admin-role"><Shield size={12} /> Admin</span> : <span className="role-badge customer-role"><User size={12} /> Customer</span>}</td>
                  <td>
                    {u.email_verified ? (
                      <span className="role-badge customer-role">Verified</span>
                    ) : (
                      <span className="role-badge" style={{ background: 'rgba(234,179,8,0.15)', color: '#92400e' }}>Unverified</span>
                    )}
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
        {pendingResets.length > 0 && (
          <div className="admin-panel">
            <h2>Pending password resets</h2>
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
          </div>
        )}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-sm btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
            <span className="page-info">Page {page} of {totalPages}</span>
            <button className="btn btn-sm btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { reviewsAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { Star, Trash2, Check, X, BarChart3 } from '@/components/icons';

import { useToast } from "@/components/ToastProvider";

import type {  Review  } from "@/features/pages/types";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
export default function AdminReviewsPage() {
  const toast = useToast();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/admin/login'); return; }
    loadData();
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        reviewsAPI.getAll({}),
        reviewsAPI.getStats(),
      ]);
      setReviews(reviewsRes.data.results || reviewsRes.data);
      setStats(statsRes.data);
    } catch { console.error('Failed to load reviews'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await reviewsAPI.delete(id);
      setReviews(reviews.filter(r => r.id !== id));
    } catch { toast.error('Failed to delete review'); }
  };

  const handleApprove = async (id: number) => {
    try {
      const res = await reviewsAPI.approve(id, { status: 'approved' });
      setReviews(reviews.map(r => r.id === id ? res.data : r));
    } catch { toast.error('Failed to approve review'); }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await reviewsAPI.approve(id, { status: 'deleted' });
      setReviews(reviews.map(r => r.id === id ? res.data : r));
    } catch { toast.error('Failed to reject review'); }
  };

  const filtered = reviews.filter(r => {
    if (filter === 'approved') return r.status === 'approved';
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'deleted') return r.status === 'deleted';
    return true;
  });

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading reviews...</div></div>;

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1><Star size={20} /> Reviews Management</h1>
        <p>{reviews.length} total reviews</p>
      </div>

      {stats && (
        <div className="admin-reviews-stats">
          <div className="stat-card"><span className="stat-value">{stats.total}</span><span className="stat-label">Total</span></div>
          <div className="stat-card"><span className="stat-value">{stats.approved}</span><span className="stat-label">Approved</span></div>
          <div className="stat-card"><span className="stat-value">{stats.pending}</span><span className="stat-label">Pending</span></div>
          <div className="stat-card"><span className="stat-value">{stats.deleted}</span><span className="stat-label">Deleted</span></div>
          <div className="stat-card"><span className="stat-value">{stats.average_rating?.toFixed(1) || 'N/A'}</span><span className="stat-label">Avg Rating</span></div>
        </div>
      )}

      <div className="admin-toolbar">
        <select value={filter} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFilter(e.target.value)} className="filter-select">
          <option value="all">All Reviews</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      <div className="admin-content">
        <div className="admin-bookings-table">
          <div className="table-responsive"><table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Author</th>
                <th>Rating</th>
                <th>Content</th>
                <th>Tour</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="empty-cell">No reviews found</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td><strong>{r.user_name}</strong></td>
                  <td>
                    <span className="review-stars">
                      {Array.from({ length: r.rating }, (_: any, i: number) => <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />)}
                    </span>
                  </td>
                  <td className="tip-cell">{r.content?.substring(0, 80)}{r.content?.length > 80 ? '...' : ''}</td>
                  <td>{r.tour_title || '-'}</td>
                  <td>{new Date(r.created_at ?? 0).toLocaleDateString()}</td>
                  <td>
                    {r.status === 'approved' ? <span className="status-badge status-confirmed">Approved</span> :
                     r.status === 'deleted' ? <span className="status-badge status-cancelled">Deleted</span> :
                     <span className="status-badge status-pending">Pending</span>}
                  </td>
                  <td>
                    <div className="admin-actions">
                      {r.status === 'pending' && (
                        <>
                          <button className="btn btn-sm btn-outline" title="Approve" onClick={() => handleApprove(r.id)}>
                            <Check size={14} />
                          </button>
                          <button className="btn btn-sm btn-danger" title="Reject" onClick={() => handleReject(r.id)}>
                            <X size={14} />
                          </button>
                        </>
                      )}
                      <button className="btn btn-sm btn-danger" title="Delete" onClick={() => handleDelete(r.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}
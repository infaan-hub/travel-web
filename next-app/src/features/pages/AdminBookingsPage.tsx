"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { ClipboardList, CheckCircle, XCircle, Trash2, ChevronLeft, ChevronRight, Filter } from '@/components/icons';

import { useToast } from "@/components/ToastProvider";

import type {  Booking  } from "@/features/pages/types";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
export default function AdminBookingsPage() {
  const toast = useToast();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/admin/login'); return; }
    adminAPI.getAllBookings()
      .then(res => setBookings((res.data.results || res.data) as Booking[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const handleStatus = async (id: number, status: string) => {
    try {
      await adminAPI.updateBookingStatus(id, status);
      setBookings(bookings.map(b => b.id === id ? { ...b, status: status as Booking['status'] } : b));
    } catch { toast.error('Failed to update booking'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this booking?')) return;
    try {
      await adminAPI.deleteBooking(id);
      setBookings(bookings.filter(b => b.id !== id));
    } catch { toast.error('Failed to delete booking'); }
  };

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading bookings...</div></div>;

  const filtered = bookings.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchStatus;
  });
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>All Bookings</h1>
        <p>{bookings.length} total bookings</p>
      </div>

      <div className="admin-toolbar">
        <div className="filter-select-group">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-bookings-table">
          <div className="table-responsive"><table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Tour</th>
                <th>Travelers</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="empty-cell">No bookings found</td></tr>
              ) : paged.map(b => (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td>
                    <strong>{b.full_name}</strong><br />
                    <small>{b.email}<br />{b.phone}</small>
                  </td>
                  <td>{b.tour_title}</td>
                  <td>{b.travelers}</td>
                  <td>{new Date(b.travel_date).toLocaleDateString()}</td>
                  <td>${b.total_price}</td>
                  <td><span className={`booking-status status-${b.status}`}>{b.status}</span></td>
                  <td>
                    <div className="admin-actions">
                      {b.status === 'pending' && (
                        <>
                          <button className="btn btn-sm btn-success" onClick={() => handleStatus(b.id, 'confirmed')}><CheckCircle size={14} /></button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleStatus(b.id, 'cancelled')}><XCircle size={14} /></button>
                        </>
                      )}
                      {b.status === 'confirmed' && (
                        <button className="btn btn-sm btn-danger" onClick={() => handleStatus(b.id, 'cancelled')}><XCircle size={14} /></button>
                      )}
                      <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(b.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
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
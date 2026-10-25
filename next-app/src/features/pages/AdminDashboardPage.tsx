"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import api from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { Globe, ClipboardList, Users, CheckCircle, ArrowRight, Plus, Shield } from '@/components/icons';

import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/admin-dashboard.module.css";

import type {  Booking, Customer, DashboardStats  } from "@/features/pages/types";
function bookingBadgeClass(status: string) {
  if (status === 'confirmed') return `${styles.dashBadge} ${styles.dashBadgeOk}`;
  if (status === 'cancelled') return `${styles.dashBadge} ${styles.dashBadgeDanger}`;
  return `${styles.dashBadge} ${styles.dashBadgeWarn}`;
}

export default function AdminDashboardPage() {
  const toast = useToast();
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/login'); return; }
    Promise.all([
      api.get('/dashboard/stats/'),
      api.get('/all-bookings/'),
      api.get('/users/'),
    ]).then(([statsRes, bookingsRes, usersRes]) => {
      setStats(statsRes.data);
      setBookings(bookingsRes.data.results || bookingsRes.data);
      setUsers(usersRes.data.results || usersRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const handleBookingStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/bookings/${id}/`, { status });
      setBookings(bookings.map(b => b.id === id ? { ...b, status: status as Booking['status'] } : b));
    } catch (err: any) {
      toast.error('Failed to update booking status');
    }
  };

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) {
    return (
      <div className={styles.dashboardRoot}>
        <div className={styles.dashEmpty}>Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardRoot}>
      <header className={styles.dashMasthead}>
        <div className={styles.dashMastheadText}>
          <p className={styles.dashEyebrow}>Admin workspace</p>
          <h1 className={styles.dashTitle}>Platform dashboard</h1>
          <p className={styles.dashLead}>
            Manage platform activity, users, companies, experiences, bookings, and attractions.
          </p>
        </div>
        <div className={styles.dashActions}>
          <button className="btn btn-primary" onClick={() => router.push('/admin/companies')}>
            <Plus size={16} /> Manage Companies
          </button>
          <button className="btn btn-outline" onClick={() => router.push('/admin/tours')}>
            Manage Experiences
          </button>
          <button className="btn btn-outline" onClick={() => router.push('/admin/users')}>
            Manage Users
          </button>
        </div>
      </header>

      {stats && (
        <section className={styles.dashHero} aria-label="Admin overview">
          <div className={styles.dashHeroMain}>
            <div className={styles.dashIdentity}>
              <span className={styles.dashLogo}>
                <Shield size={24} />
              </span>
              <div className={styles.dashIdentityText}>
                <h2 className={styles.dashName}>{user?.username ?? 'Administrator'}</h2>
                <p className={styles.dashSlug}>@admin</p>
              </div>
              <span className={`${styles.dashPill} ${styles.dashPillOk} ${styles.dashIdentityPill}`}>
                <CheckCircle size={13} /> Admin access
              </span>
            </div>
            <p className={styles.dashCopy}>
              Monitor tours, bookings, users, and platform health from one place.
            </p>
            <ul className={styles.dashMetaRow}>
              <li className={styles.dashPill}>
                <Globe size={13} /> {stats.total_tours} tours
              </li>
              <li className={styles.dashPill}>
                <Users size={13} /> {stats.total_users} users
              </li>
              <li className={styles.dashPill}>
                <ClipboardList size={13} /> {stats.total_bookings} bookings
              </li>
            </ul>
          </div>

          <aside className={styles.dashAside}>
            <div className={styles.dashAsideMain}>
              <p className={styles.dashAsideLabel}>Pending bookings</p>
              <p className={styles.dashAsideValue}>{stats.pending_bookings}</p>
              <p className={styles.dashAsideCopy}>
                Require confirmation or cancellation.
              </p>
            </div>
            <button className={styles.dashAsideCta} onClick={() => setActiveTab('bookings')}>
              Review queue <ArrowRight size={14} />
            </button>
          </aside>
        </section>
      )}

      <div className={styles.dashActions}>
        <button className={activeTab === 'overview' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={activeTab === 'bookings' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setActiveTab('bookings')}>
          Bookings
        </button>
        <button className={activeTab === 'users' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setActiveTab('users')}>
          Users
        </button>
      </div>

      {stats && (
        <section className={styles.dashPanel}>
          <div className={styles.dashPanelHead}>
            <div className={styles.dashPanelHeadMain}>
              <span className={styles.dashPanelIcon} aria-hidden="true">
                <Globe size={17} />
              </span>
              <div>
                <h2 className={styles.dashPanelTitle}>Platform metrics</h2>
                <p className={styles.dashPanelCopy}>Key counts across the travel system.</p>
              </div>
            </div>
          </div>
          <ul className={styles.dashList}>
            <li className={styles.dashRow}>
              <div className={styles.dashRowMain}>
                <span className={styles.dashRowTitle}>Tours</span>
                <span className={styles.dashRowSub}>Total experiences in the catalogue</span>
              </div>
              <div className={styles.dashRowEnd}>
                <span className={styles.dashRowMeta}>{stats.total_tours}</span>
              </div>
            </li>
            <li className={styles.dashRow}>
              <div className={styles.dashRowMain}>
                <span className={styles.dashRowTitle}>Bookings</span>
                <span className={styles.dashRowSub}>All customer bookings</span>
              </div>
              <div className={styles.dashRowEnd}>
                <span className={styles.dashRowMeta}>{stats.total_bookings}</span>
              </div>
            </li>
            <li className={styles.dashRow}>
              <div className={styles.dashRowMain}>
                <span className={styles.dashRowTitle}>Attractions</span>
                <span className={styles.dashRowSub}>Listed attractions</span>
              </div>
              <div className={styles.dashRowEnd}>
                <span className={styles.dashRowMeta}>{stats.total_attractions}</span>
              </div>
            </li>
            <li className={styles.dashRow}>
              <div className={styles.dashRowMain}>
                <span className={styles.dashRowTitle}>Users</span>
                <span className={styles.dashRowSub}>Registered accounts</span>
              </div>
              <div className={styles.dashRowEnd}>
                <span className={styles.dashRowMeta}>{stats.total_users}</span>
              </div>
            </li>
            <li className={styles.dashRow}>
              <div className={styles.dashRowMain}>
                <span className={styles.dashRowTitle}>Pending</span>
                <span className={styles.dashRowSub}>Bookings awaiting review</span>
              </div>
              <div className={styles.dashRowEnd}>
                <span className={styles.dashRowMeta}>{stats.pending_bookings}</span>
              </div>
            </li>
            <li className={styles.dashRow}>
              <div className={styles.dashRowMain}>
                <span className={styles.dashRowTitle}>Confirmed</span>
                <span className={styles.dashRowSub}>Approved bookings</span>
              </div>
              <div className={styles.dashRowEnd}>
                <span className={styles.dashRowMeta}>{stats.confirmed_bookings}</span>
              </div>
            </li>
            <li className={styles.dashRow}>
              <div className={styles.dashRowMain}>
                <span className={styles.dashRowTitle}>Zanzibar Tours</span>
                <span className={styles.dashRowSub}>Zanzibar experiences</span>
              </div>
              <div className={styles.dashRowEnd}>
                <span className={styles.dashRowMeta}>{stats.zanzibar_tours}</span>
              </div>
            </li>
            <li className={styles.dashRow}>
              <div className={styles.dashRowMain}>
                <span className={styles.dashRowTitle}>Tanzania Tours</span>
                <span className={styles.dashRowSub}>Mainland experiences</span>
              </div>
              <div className={styles.dashRowEnd}>
                <span className={styles.dashRowMeta}>{stats.tanzania_tours}</span>
              </div>
            </li>
          </ul>
        </section>
      )}

      <>
        {activeTab === 'overview' && (
          <section className={styles.dashPanel}>
            <div className={styles.dashPanelHead}>
              <div className={styles.dashPanelHeadMain}>
                <span className={styles.dashPanelIcon} aria-hidden="true">
                  <Globe size={17} />
                </span>
                <div>
                  <h2 className={styles.dashPanelTitle}>Welcome to Admin Panel</h2>
                  <p className={styles.dashPanelCopy}>
                    Manage platform activity, users, companies, experiences, bookings, and attractions.
                  </p>
                </div>
              </div>
            </div>
            <div className={styles.dashActions}>
              <button className="btn btn-outline" onClick={() => router.push('/admin/tours')}>
                Manage Experiences
              </button>
              <button className="btn btn-outline" onClick={() => router.push('/admin/users')}>
                Manage Users
              </button>
              <button className="btn btn-primary" onClick={() => router.push('/admin/companies')}>
                Manage Companies
              </button>
            </div>
          </section>
        )}

        {activeTab === 'bookings' && (
          <section className={styles.dashPanel}>
            <div className={styles.dashPanelHead}>
              <div className={styles.dashPanelHeadMain}>
                <span className={styles.dashPanelIcon} aria-hidden="true">
                  <ClipboardList size={17} />
                </span>
                <div>
                  <h2 className={styles.dashPanelTitle}>All Bookings ({bookings.length})</h2>
                  <p className={styles.dashPanelCopy}>Latest platform booking activity.</p>
                </div>
              </div>
            </div>
            {bookings.length === 0 ? (
              <p className={styles.dashEmpty}>No bookings found</p>
            ) : (
              <ul className={styles.dashList}>
                {bookings.map((b: Booking) => (
                  <li className={styles.dashRow} key={b.id}>
                    <div className={styles.dashRowMain}>
                      <span className={styles.dashRowTitle}>#{b.id} · {b.full_name}</span>
                      <span className={styles.dashRowSub}>
                        {b.tour_title || 'Tour'} · {b.travelers} travelers · {new Date(b.travel_date).toLocaleDateString()} · ${b.total_price}
                      </span>
                      <span className={styles.dashRowSub}>{b.email} · {b.phone}</span>
                    </div>
                    <div className={styles.dashRowEnd}>
                      <span className={bookingBadgeClass(b.status)}>{b.status}</span>
                      {b.status === 'pending' && (
                        <div className={styles.dashActions}>
                          <button className="btn btn-sm btn-success" onClick={() => handleBookingStatus(b.id, 'confirmed')}>Confirm</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleBookingStatus(b.id, 'cancelled')}>Cancel</button>
                        </div>
                      )}
                      {b.status === 'confirmed' && (
                        <button className="btn btn-sm btn-danger" onClick={() => handleBookingStatus(b.id, 'cancelled')}>Cancel</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === 'users' && (
          <section className={styles.dashPanel}>
            <div className={styles.dashPanelHead}>
              <div className={styles.dashPanelHeadMain}>
                <span className={styles.dashPanelIcon} aria-hidden="true">
                  <Users size={17} />
                </span>
                <div>
                  <h2 className={styles.dashPanelTitle}>Registered Users ({users.length})</h2>
                  <p className={styles.dashPanelCopy}>Customer and admin accounts.</p>
                </div>
              </div>
            </div>
            {users.length === 0 ? (
              <p className={styles.dashEmpty}>No users found</p>
            ) : (
              <ul className={styles.dashList}>
                {users.map((u: any) => (
                  <li className={styles.dashRow} key={u.id}>
                    <div className={styles.dashRowMain}>
                      <span className={styles.dashRowTitle}>{u.username}</span>
                      <span className={styles.dashRowSub}>{u.email}</span>
                    </div>
                    <div className={styles.dashRowEnd}>
                      <span className={styles.dashPill}>
                        {u.is_staff ? <><CheckCircle size={13} /> Admin</> : <><Users size={13} /> Customer</>}
                      </span>
                      <button type="button" onClick={() => router.push('/admin/users')} className="btn btn-sm btn-outline">
                        Manage
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </>
    </div>
  );
}
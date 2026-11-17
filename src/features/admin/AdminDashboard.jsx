import { useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getDashboardStats } from './adminService';
import ChartCard from './components/ChartCard';
import { useCachedFetch } from '../../lib/cache';
import { showError } from '../../lib/alerts';
import { Skeleton } from '../../components/Loading';
import '../../layouts/Admin.css';

// Defined outside the component so the cache hook keeps a stable reference.
const fetchDashboard = async () => {
  const { data } = await getDashboardStats();
  return data;
};
const STATUS_LABEL = {
  available: 'Available',
  maintenance: 'Maintenance',
  out_of_service: 'Out of service',
};
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const PAYMENT_LABEL = {
  downpayment: 'Downpayment',
  full: 'Full payment',
  balance: 'Balance payment',
  service: 'Extra services',
};

const PAYMENT_BADGE = {
  pending: 'badge-amber',
  paid: 'badge-green',
  expired: 'badge-gray',
  failed: 'badge-red',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useCachedFetch('admin:dashboard', fetchDashboard);

  useEffect(() => {
    if (error) {
      showError('Could not load statistics', error.response?.data?.message || 'Try again.');
    }
  }, [error]);

  const cards = useMemo(() => {
    if (!data) return [];
    const s = data.stats;
    return [
      { label: 'Total rooms', value: s.total_rooms },
      { label: 'Available rooms', value: s.available_rooms },
      { label: 'Occupied now', value: s.occupied_now ?? s.occupied_rooms },
      { label: 'Maintenance', value: s.maintenance_rooms },
      { label: 'Room categories', value: s.room_categories },
      { label: 'Registered guests', value: s.registered_customers },
      { label: 'Total reservations', value: s.total_reservations },
      { label: 'Paid revenue', value: peso.format(Number(s.revenue || 0)) },
      { label: 'Pending bookings', value: s.pending_reservations },
      { label: 'Confirmed bookings', value: s.confirmed_reservations },
      { label: 'Checked in', value: s.checked_in_reservations },
      { label: 'Completed stays', value: s.checked_out_reservations },
      { label: 'Cancelled', value: s.cancelled_reservations },
      { label: 'Rejected', value: s.rejected_reservations },
    ];
  }, [data]);

  const statusLabels = useMemo(
    () => (data?.rooms_by_status || []).map((r) => STATUS_LABEL[r.status] || r.status),
    [data]
  );
  const statusValues = useMemo(
    () => (data?.rooms_by_status || []).map((r) => r.total),
    [data]
  );
  const categoryLabels = useMemo(
    () => (data?.rooms_by_category || []).map((c) => c.name),
    [data]
  );
  const categoryValues = useMemo(
    () => (data?.rooms_by_category || []).map((c) => c.total),
    [data]
  );
  const recentReservations = data?.recent_reservations || [];
  const recentPayments = data?.recent_payments || [];
  const trends = data?.trends || { labels: [], reservations: [], revenue: [] };

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">
            Welcome back, {user?.username}. Here is the latest view of hotel operations.
          </p>
        </div>
      </div>

      {loading && !data && (
        <div className="dashboard-skeletons" role="status" aria-label="Loading dashboard">
          <div className="stat-grid">
            {[0, 1, 2, 3].map((item) => <Skeleton className="skeleton-stat" key={item} />)}
          </div>
          <div className="chart-grid">
            {[0, 1].map((item) => <Skeleton className="skeleton-chart" key={item} />)}
          </div>
        </div>
      )}

      {data && (
        <>
          <div className="stat-grid">
            {cards.map((c) => (
              <div className="stat-card" key={c.label}>
                <div>
                  <p className="stat-label">{c.label}</p>
                  <p className="stat-value">{c.value === null ? '—' : c.value}</p>
                  {c.value === null && <p className="stat-note">Module not built yet</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="chart-grid">
            <ChartCard
              title="Room status"
              type="doughnut"
              labels={statusLabels}
              values={statusValues}
            />
            <ChartCard
              title="Rooms by category"
              type="bar"
              labels={categoryLabels}
              values={categoryValues}
            />
          </div>

          <div className="chart-grid trend-grid">
            <ChartCard
              title="Reservations · 12 months"
              type="line"
              labels={trends.labels}
              values={trends.reservations}
            />
            <ChartCard
              title="Paid revenue · 12 months"
              type="line"
              accent="gold"
              labels={trends.labels}
              values={trends.revenue}
              formatValue={(value) => peso.format(Number(value))}
            />
          </div>

          <div className="activity-grid">
            <section className="admin-card activity-card">
              <div className="activity-heading">
                <div>
                  <p className="activity-eyebrow">LATEST ACTIVITY</p>
                  <h2>Recent reservations</h2>
                </div>
                <span className="activity-count">{recentReservations.length}</span>
              </div>
              {recentReservations.length === 0 ? (
                <p className="activity-empty">No reservations have been recorded yet.</p>
              ) : (
                <ul className="activity-list">
                  {recentReservations.map((reservation) => (
                    <li key={reservation.reservation_code}>
                      <span className="activity-marker" aria-hidden="true" />
                      <div className="activity-main">
                        <strong>{reservation.guest_name}</strong>
                        <span>
                          Room {reservation.room_number} · {reservation.check_in_date} – {reservation.check_out_date}
                        </span>
                      </div>
                      <span className={`badge ${
                        reservation.status === 'confirmed' || reservation.status === 'checked_in'
                          ? 'badge-green'
                          : reservation.status === 'pending'
                            ? 'badge-amber'
                            : 'badge-gray'
                      }`}>
                        {reservation.status.replaceAll('_', ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-card activity-card">
              <div className="activity-heading">
                <div>
                  <p className="activity-eyebrow">FINANCIAL ACTIVITY</p>
                  <h2>Recent payments</h2>
                </div>
                <span className="activity-count">{recentPayments.length}</span>
              </div>
              {recentPayments.length === 0 ? (
                <p className="activity-empty">No payments have been recorded yet.</p>
              ) : (
                <ul className="activity-list">
                  {recentPayments.map((payment) => (
                    <li key={payment.id}>
                      <span className="activity-marker payment-marker" aria-hidden="true" />
                      <div className="activity-main">
                        <strong>{payment.guest_name} · {peso.format(Number(payment.amount || 0))}</strong>
                        <span>
                          {PAYMENT_LABEL[payment.kind] || payment.kind} · {payment.provider} · Room {payment.room_number}
                        </span>
                      </div>
                      <span className={`badge ${PAYMENT_BADGE[payment.status] || 'badge-gray'}`}>
                        {payment.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
import { useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getDashboardStats } from './adminService';
import ChartCard from './components/ChartCard';
import { useCachedFetch } from '../../lib/cache';
import { showError } from '../../lib/alerts';
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
      { label: 'Total Rooms', value: s.total_rooms, icon: '🛏️', tone: 'green' },
      { label: 'Available', value: s.available_rooms, icon: '✅', tone: 'teal' },
      { label: 'Occupied now', value: s.occupied_now ?? s.occupied_rooms, icon: '🔑', tone: 'amber' },
      { label: 'Maintenance', value: s.maintenance_rooms, icon: '🛠️', tone: 'red' },
      { label: 'Room Categories', value: s.room_categories, icon: '🏷️', tone: 'blue' },
      { label: 'Customers', value: s.registered_customers, icon: '👥', tone: 'purple' },
      { label: 'Reservations', value: s.total_reservations, icon: '📅', tone: 'gray' },
      { label: 'Revenue', value: s.revenue, icon: '💳', tone: 'gray' },
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

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Welcome back, {user?.username}.</p>
        </div>
      </div>

      {loading && !data && <div className="admin-loading">Loading dashboard…</div>}

      {data && (
        <>
          <div className="stat-grid">
            {cards.map((c) => (
              <div className={`stat-card tone-${c.tone}`} key={c.label}>
                <div className="stat-icon">{c.icon}</div>
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
              title="Rooms by Status"
              type="doughnut"
              labels={statusLabels}
              values={statusValues}
            />
            <ChartCard
              title="Rooms per Category"
              type="bar"
              labels={categoryLabels}
              values={categoryValues}
            />
          </div>
        </>
      )}
    </section>
  );
}
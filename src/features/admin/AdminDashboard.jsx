import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getDashboardStats } from './adminService';
import ChartCard from './components/ChartCard';
import '../../layouts/Admin.css';

const STATUS_LABEL = {
  available: 'Available',
  occupied: 'Occupied',
  maintenance: 'Maintenance',
  out_of_service: 'Out of service',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getDashboardStats()
      .then(({ data }) => { if (active) setData(data); })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Could not load statistics.');
      });

    return () => { active = false; };
  }, []);

  if (error) {
    return <div className="auth-message auth-error" role="alert">{error}</div>;
  }

  if (!data) {
    return <div className="admin-loading">Loading dashboard…</div>;
  }

  const s = data.stats;

  const cards = [
    { label: 'Total Rooms', value: s.total_rooms, icon: '🛏️', tone: 'green' },
    { label: 'Available', value: s.available_rooms, icon: '✅', tone: 'teal' },
    { label: 'Occupied', value: s.occupied_rooms, icon: '🔑', tone: 'amber' },
    { label: 'Maintenance', value: s.maintenance_rooms, icon: '🛠️', tone: 'red' },
    { label: 'Room Categories', value: s.room_categories, icon: '🏷️', tone: 'blue' },
    { label: 'Customers', value: s.registered_customers, icon: '👥', tone: 'purple' },
    { label: 'Reservations', value: s.total_reservations, icon: '📅', tone: 'gray' },
    { label: 'Revenue', value: s.revenue, icon: '💳', tone: 'gray' },
  ];

  const statusLabels = data.rooms_by_status.map((r) => STATUS_LABEL[r.status] || r.status);
  const statusValues = data.rooms_by_status.map((r) => r.total);

  const categoryLabels = data.rooms_by_category.map((c) => c.name);
  const categoryValues = data.rooms_by_category.map((c) => c.total);

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Welcome back, {user?.username}.</p>
        </div>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div className={`stat-card tone-${c.tone}`} key={c.label}>
            <div className="stat-icon">{c.icon}</div>
            <div>
              <p className="stat-label">{c.label}</p>
              <p className="stat-value">
                {c.value === null ? '—' : c.value}
              </p>
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
    </section>
  );
}
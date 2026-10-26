import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import './Admin.css';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/categories', label: 'Room Categories' },
  { to: '/admin/rooms', label: 'Room Management' },
  { to: '/admin/pricing', label: 'Room Pricing' },
  { to: '/admin/availability', label: 'Room Availability' },
  { to: '/admin/reservations', label: 'Reservations' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/check-in-out', label: 'Check-in / Check-out' },
  { to: '/admin/payments', label: 'Payments & Billing' },
  { to: '/admin/notifications', label: 'Notifications' },
  { to: '/admin/reports', label: 'Reports' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="admin-brand">Hotel Admin</div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                isActive ? 'admin-link active' : 'admin-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <button
            className="admin-menu-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <span className="admin-user">{user?.username}</span>
          <button className="admin-logout" onClick={handleLogout}>
            Logout
          </button>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
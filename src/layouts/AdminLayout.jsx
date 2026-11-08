import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { ADMIN_ROLES, MANAGER_ROLES, STAFF_ROLES } from '../lib/roles';
import './Admin.css';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', roles: MANAGER_ROLES },
  { to: '/admin/staff', label: 'Staff and Managers', roles: ADMIN_ROLES },
  { to: '/admin/hotel', label: 'Hotel Information', roles: ADMIN_ROLES },
  { to: '/admin/categories', label: 'Room Categories', roles: MANAGER_ROLES },
  { to: '/admin/rooms', label: 'Room Management', roles: MANAGER_ROLES },
  { to: '/admin/pricing', label: 'Room Pricing', roles: MANAGER_ROLES },
  { to: '/admin/services', label: 'Extra Services', roles: STAFF_ROLES },
  { to: '/admin/availability', label: 'Room Availability', roles: STAFF_ROLES },
  { to: '/admin/reservations', label: 'Reservations', roles: STAFF_ROLES },
  { to: '/admin/customers', label: 'Customers', roles: STAFF_ROLES },
  { to: '/admin/check-in-out', label: 'Check-in / Check-out', roles: STAFF_ROLES },
  { to: '/admin/payments', label: 'Payments & Billing', roles: MANAGER_ROLES },
  { to: '/admin/notifications', label: 'Notifications', roles: STAFF_ROLES },
  { to: '/admin/reviews', label: 'Reviews', roles: MANAGER_ROLES },
  { to: '/admin/reports', label: 'Reports', roles: MANAGER_ROLES },
];

const ROLE_TEXT = { admin: 'Admin', manager: 'Manager', staff: 'Front desk' };

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  async function handleLogout() {
    await logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="admin-brand">Hotel Admin</div>
        <nav>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'admin-link active' : 'admin-link')}
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
          <span className="badge badge-gray">{ROLE_TEXT[user?.role] || user?.role}</span>
          <span className="admin-user">{user?.username}</span>
          <button className="admin-logout" onClick={handleLogout}>Logout</button>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
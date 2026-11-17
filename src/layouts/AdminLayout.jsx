import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { ADMIN_ROLES, MANAGER_ROLES, STAFF_ROLES } from '../lib/roles';
import { prefetchCachedFetch } from '../lib/cache';
import { adminPagePrefetchers } from '../features/admin/adminService';
import './Admin.css';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard', roles: MANAGER_ROLES }],
  },
  {
    label: 'Guest operations',
    items: [
      { to: '/admin/reservations', label: 'Reservations', icon: 'calendar', roles: STAFF_ROLES },
      { to: '/admin/availability', label: 'Room availability', icon: 'availability', roles: STAFF_ROLES },
      { to: '/admin/check-in-out', label: 'Check-in / Check-out', icon: 'checkin', roles: STAFF_ROLES },
      { to: '/admin/customers', label: 'Guests', icon: 'guests', roles: STAFF_ROLES },
      { to: '/admin/services', label: 'Extra services', icon: 'services', roles: STAFF_ROLES },
      { to: '/admin/notifications', label: 'Messages', icon: 'messages', roles: STAFF_ROLES },
    ],
  },
  {
    label: 'Property',
    items: [
      { to: '/admin/rooms', label: 'Rooms', icon: 'rooms', roles: MANAGER_ROLES },
      { to: '/admin/categories', label: 'Room categories', icon: 'categories', roles: MANAGER_ROLES },
      { to: '/admin/pricing', label: 'Room pricing', icon: 'pricing', roles: MANAGER_ROLES },
      { to: '/admin/hotel', label: 'Hotel information', icon: 'hotel', roles: ADMIN_ROLES },
    ],
  },
  {
    label: 'Finance & insights',
    items: [
      { to: '/admin/payments', label: 'Payments & billing', icon: 'payments', roles: MANAGER_ROLES },
      { to: '/admin/reports', label: 'Reports', icon: 'reports', roles: MANAGER_ROLES },
      { to: '/admin/reviews', label: 'Guest reviews', icon: 'reviews', roles: MANAGER_ROLES },
    ],
  },
  {
    label: 'Administration',
    items: [{ to: '/admin/staff', label: 'Staff & managers', icon: 'staff', roles: ADMIN_ROLES }],
  },
];

const ROLE_TEXT = { admin: 'Admin', manager: 'Manager', staff: 'Front desk' };

const ICONS = {
  dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h3M8 16.5h3M14 13h2.5" /></>,
  availability: <><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17" /></>,
  checkin: <><path d="M5 20V4.5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1V20M3 20h18M10 12h.01" /><path d="m14 10 3 2-3 2" /></>,
  guests: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20zM16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.5 4.4V20" /></>,
  services: <><path d="M12 3.5v17M3.5 12h17M5.5 5.5l13 13M18.5 5.5l-13 13" /><circle cx="12" cy="12" r="7.5" /></>,
  messages: <><path d="M4 5.5h16v12H9l-5 3z" /><path d="M8 10h8M8 13.5h5" /></>,
  rooms: <><path d="M3.5 19.5v-12M3.5 15h17v4.5M20.5 11v8.5M6.5 11V8.5h5a3 3 0 0 1 3 3" /><path d="M14.5 11h3a3 3 0 0 1 3 3v1" /></>,
  categories: <><path d="m12 3.5 8.5 4.7L12 13 3.5 8.2zM3.5 12 12 16.7l8.5-4.7M3.5 15.8l8.5 4.7 8.5-4.7" /></>,
  pricing: <><path d="M4 4.5h8l8 8-7.5 7.5-8-8z" /><circle cx="8.5" cy="8.5" r="1" /></>,
  hotel: <><path d="M4 20.5V4.5h16v16M2.5 20.5h19M8 8h2M14 8h2M8 12h2M14 12h2M10 20.5v-4h4v4" /></>,
  payments: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9.5h18M7 14.5h4" /></>,
  reports: <><path d="M4 20V4M4 20h17M7.5 16v-4M12.5 16V7M17.5 16V10" /></>,
  reviews: <><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9z" /></>,
  staff: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20zM18 7v6M15 10h6" /></>,
};

function NavIcon({ name }) {
  return (
    <span className="admin-nav-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">{ICONS[name]}</svg>
    </span>
  );
}

function prefetchAdminPage(path, role) {
  for (const item of adminPagePrefetchers[path] || []) {
    if (item.managerOnly && !MANAGER_ROLES.includes(role)) continue;
    void prefetchCachedFetch(item.key, item.fetcher).catch((error) => {
      console.warn(`Could not prefetch ${path}.`, error);
    });
  }
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(user?.role)),
  })).filter((group) => group.items.length > 0);

  async function handleLogout() {
    await logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      {menuOpen && (
        <button
          type="button"
          className="admin-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside id="admin-navigation" className={`admin-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true">TL</span>
          <span className="admin-brand-copy">
            <span className="admin-brand-name">Tree of Life</span>
            <span className="admin-brand-caption">HOTEL OPERATIONS</span>
          </span>
        </div>
        <div className="admin-sidebar-rule" />
        <nav>
          {groups.map((group) => (
            <section className="admin-nav-group" key={group.label}>
              <h2 className="admin-nav-section">{group.label}</h2>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onMouseEnter={() => prefetchAdminPage(item.to, user?.role)}
                  onFocus={() => prefetchAdminPage(item.to, user?.role)}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => (isActive ? 'admin-link active' : 'admin-link')}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </section>
          ))}
        </nav>
        <div className="admin-sidebar-footer">Hospitality, thoughtfully managed</div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <button
            type="button"
            className="admin-menu-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            aria-controls="admin-navigation"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <span className="admin-header-context">HOTEL OPERATIONS</span>
          <span className="badge badge-gray admin-role">{ROLE_TEXT[user?.role] || user?.role}</span>
          <span className="admin-user-avatar" aria-hidden="true">
            {(user?.username || 'S').slice(0, 1).toUpperCase()}
          </span>
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
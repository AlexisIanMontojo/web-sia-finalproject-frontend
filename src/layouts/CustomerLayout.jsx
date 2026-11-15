import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import {
  fetchDefaultCatalogue,
  fetchHotelPageData,
  messagesApi,
} from '../features/customer/customerService';
import { prefetchCachedFetch } from '../lib/cache';
import './Customer.css';

const PUBLIC_CACHE_OPTIONS = {
  ttlMs: 5 * 60_000,
  persist: true,
  staleWhileRevalidateMs: 30 * 60_000,
};

function prefetchPage(path) {
  if (path === '/rooms') {
    void prefetchCachedFetch('public:rooms:default', fetchDefaultCatalogue, PUBLIC_CACHE_OPTIONS);
  } else if (path === '/hotel') {
    void prefetchCachedFetch('public:hotel', fetchHotelPageData, PUBLIC_CACHE_OPTIONS);
  }
}

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const unreadCount = user ? unread : 0;

  useEffect(() => {
    if (!user) return undefined;

    let active = true;

    async function refresh() {
      try {
        const { data } = await messagesApi.unreadCount();
        if (active) setUnread(data.unread);
      } catch {
        if (active) setUnread(0);
      }
    }

    refresh();
    window.addEventListener('messages:changed', refresh);
    const timer = setInterval(refresh, 60000);

    return () => {
      active = false;
      window.removeEventListener('messages:changed', refresh);
      clearInterval(timer);
    };
  }, [user]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="cust-shell">
      <header className="cust-nav">
        <Link to="/rooms" className="cust-brand">Hotel Reservation</Link>

        <nav>
          <NavLink to="/rooms" onMouseEnter={() => prefetchPage('/rooms')} onFocus={() => prefetchPage('/rooms')}>
            Rooms
          </NavLink>
          <NavLink to="/hotel" onMouseEnter={() => prefetchPage('/hotel')} onFocus={() => prefetchPage('/hotel')}>
            Hotel
          </NavLink>
          {user && (
            <NavLink to="/contact" className="nav-bell">
              Contact
              {unreadCount > 0 && (
                <span className="bell-badge" aria-label={`${unreadCount} new notifications`}>
                  {unreadCount}
                </span>
              )}
            </NavLink>
          )}
          {user && <NavLink to="/my-reservations">My Reservations</NavLink>}
          {user && <NavLink to="/profile">Profile</NavLink>}
        </nav>

        {user ? (
          <div className="cust-user">
            <span className="cust-user-name">{user.username}</span>
            <button className="cust-logout" onClick={handleLogout}>Sign out</button>
          </div>
        ) : (
          <Link to="/login" className="cust-login">Sign in</Link>
        )}
      </header>

      <main className="cust-content">
        <Outlet />
      </main>

      <footer className="cust-footer">
        <span>© {new Date().getFullYear()} Hotel Reservation System</span>
        <span>
          <Link to="/contact">Contact the hotel</Link>
        </span>
      </footer>
    </div>
  );
}
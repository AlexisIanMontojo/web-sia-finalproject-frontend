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
  const [menuOpen, setMenuOpen] = useState(false);
  const unreadCount = user ? unread : 0;

  useEffect(() => {
    if (!user) return undefined;

    let active = true;

    async function refresh() {
      try {
        const { data } = await messagesApi.unreadCount();
        if (active) setUnread(data.unread);
      } catch {
        // Keep the last known count when the network is temporarily unavailable.
      }
    }

    refresh();
    window.addEventListener('messages:changed', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 15000);

    return () => {
      active = false;
      window.removeEventListener('messages:changed', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
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
        <Link to="/rooms" className="cust-brand" onClick={() => setMenuOpen(false)}>
          <span className="cust-brand-mark" aria-hidden="true">TL</span>
          <span className="cust-brand-name">
            Tree of Life
            <small>HOTEL</small>
          </span>
        </Link>

        <button
          type="button"
          className="cust-menu-toggle"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          aria-controls="guest-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            {menuOpen
              ? <path d="m6 6 12 12M18 6 6 18" />
              : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <nav id="guest-navigation" className={menuOpen ? 'is-open' : ''}>
          <NavLink to="/rooms" onClick={() => setMenuOpen(false)} onMouseEnter={() => prefetchPage('/rooms')} onFocus={() => prefetchPage('/rooms')}>
            Rooms
          </NavLink>
          <NavLink to="/hotel" onClick={() => setMenuOpen(false)} onMouseEnter={() => prefetchPage('/hotel')} onFocus={() => prefetchPage('/hotel')}>
            Hotel
          </NavLink>
          {user && (
            <NavLink to="/contact" className="nav-bell" onClick={() => setMenuOpen(false)}>
              Contact
              {unreadCount > 0 && (
                <span className="bell-badge" aria-label={`${unreadCount} new notifications`}>
                  {unreadCount}
                </span>
              )}
            </NavLink>
          )}
          {user && <NavLink to="/my-reservations" onClick={() => setMenuOpen(false)}>My Reservations</NavLink>}
        </nav>

        {user ? (
          <div className="cust-user">
            <details className="cust-account">
              <summary>
                <span className="cust-account-avatar" aria-hidden="true">
                  {(user.username || 'G').slice(0, 1).toUpperCase()}
                </span>
                <span className="cust-account-label">{user.username}</span>
                <span className="cust-account-chevron" aria-hidden="true">▾</span>
              </summary>
              <div className="cust-account-menu">
                <Link to="/profile">Profile settings</Link>
                <button className="cust-logout" onClick={handleLogout}>Sign out</button>
              </div>
            </details>
          </div>
        ) : (
          <Link to="/login" className="cust-login" onClick={() => setMenuOpen(false)}>Sign in</Link>
        )}
      </header>

      <main className="cust-content">
        <Outlet />
      </main>

      <footer className="cust-footer">
        <span>© {new Date().getFullYear()} Tree of Life Hotel</span>
        <span>
          <Link to="/contact">Contact the hotel</Link>
        </span>
      </footer>
    </div>
  );
}
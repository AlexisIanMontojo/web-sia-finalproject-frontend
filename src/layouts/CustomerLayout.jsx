import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { messagesApi } from '../features/customer/customerService';
import './Customer.css';

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return undefined;
    }

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
          <NavLink to="/rooms">Rooms</NavLink>
          <NavLink to="/hotel">Hotel</NavLink>
          {user && (
            <NavLink to="/contact" className="nav-bell">
              Contact
              {unread > 0 && (
                <span className="bell-badge" aria-label={`${unread} new notifications`}>
                  {unread}
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
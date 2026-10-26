import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import logo from '../../assets/images/logo.jpg';
import { useAuth } from '../auth/AuthContext';
import '../auth/Auth.css';

export default function AdminLogin() {
  const { user, status, login, logout } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already signed in as an admin: go straight to the panel.
  if (status === 'authenticated' && user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const signedInUser = await login({
        email: form.email.trim(),
        password: form.password,
        portal: 'admin',
      });

      // The backend already rejects non-admins. This is a second check.
      if (signedInUser.role !== 'admin') {
        await logout();
        setError('This login is for administrators only.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to sign in. Please check your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <img className="auth-logo" src={logo} alt="Hotel logo" />
        <h1>Administrator Portal</h1>
        <p>
          Authorized staff only. Manage rooms, reservations, check-ins,
          and billing from one place.
        </p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <h2>Admin Sign In</h2>
          <p className="auth-subtitle">
            Enter your administrator credentials to continue.
          </p>

          {error && (
            <div className="auth-message auth-error" role="alert">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="admin-email">Admin Email</label>
              <input
                id="admin-email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </div>

            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Not an administrator? <Link to="/login">Customer sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
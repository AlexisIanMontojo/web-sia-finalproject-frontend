import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/images/logo.jpg';
import { login } from './authService';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const response = await login({
        email: form.email.trim(),
        password: form.password,
      });

      const data = response.data;

      if (data.success === false) {
        setError(data.message || 'Invalid email or password.');
        return;
      }

      const accessToken = data.access_token || data.token;

      if (accessToken) {
        localStorage.setItem('access_token', accessToken);
      }

      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }

      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // Adjust this destination to match your configured application routes.
      navigate(data.user?.role === 'admin' ? '/admin' : '/rooms');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to log in. Please check your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <img className="auth-logo" src={logo} alt="Hotel logo" />
        <h1>Welcome Back</h1>
        <p>
          Sign in to manage your reservations, view your bookings,
          and prepare for your next stay.
        </p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <h2>Sign In</h2>
          <p className="auth-subtitle">
            Enter your account details to continue.
          </p>

          {error && (
            <div className="auth-message auth-error" role="alert">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
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
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

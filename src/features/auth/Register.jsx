import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/images/logo.jpg';
import { register } from './authService';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError('Your password must contain at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const response = await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      const data = response.data;

      if (data.success === false) {
        setError(data.message || 'Registration failed.');
        return;
      }

      setSuccess(
        data.message ||
        'Your account has been created. Check your email to verify it.'
      );

      setForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to register. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <img className="auth-logo" src={logo} alt="Hotel logo" />
        <h1>Your Stay, Our Priority</h1>
        <p>
          Create an account to discover rooms, make reservations,
          and manage your hotel bookings with ease.
        </p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <h2>Create Account</h2>
          <p className="auth-subtitle">
            Join us and start planning your next stay.
          </p>

          {error && (
            <div className="auth-message auth-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-message auth-success" role="status">
              {success}
              <p>
                <Link to="/login">Continue to login</Link>
              </p>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="username">Full Name / Username</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your name"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                required
                minLength={3}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-email">Email Address</label>
              <input
                id="register-email"
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
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                name="password"
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Enter your password again"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/images/logo.jpg';
import { useAuth } from './AuthContext';
import { googleSignup, register, verifyEmailCode } from './authService';
import GoogleSignInButton from './components/GoogleSignInButton';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const googleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationChallenge, setVerificationChallenge] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
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

  async function handleGoogleSuccess(credentialResponse) {
    setError('');
    setSuccess('');

    if (!credentialResponse.credential) {
      setError('Google did not return a sign-in credential. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await googleSignup(credentialResponse.credential);
      setVerificationChallenge(data.challenge);
      setVerificationEmail(data.email);
      setSuccess(data.message || 'A verification code has been sent to your email.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to continue with Google. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data } = await verifyEmailCode({
        challenge: verificationChallenge,
        code: verificationCode.trim(),
      });
      loginWithTokens(data);
      navigate('/rooms', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to verify your email. Please check the code and try again.'
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

          {googleConfigured && (
            <>
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in was not completed. Please try again.')}
              />
              {!verificationEmail && (
                <div className="auth-divider"><span>or sign up with email</span></div>
              )}
            </>
          )}

          {error && (
            <div className="auth-message auth-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-message auth-success" role="status">
              {success}
              {!verificationEmail && (
                <p>
                  <Link to="/login">Continue to login</Link>
                </p>
              )}
            </div>
          )}

          {verificationEmail ? (
            <form className="auth-form" onSubmit={handleVerifyCode}>
              <p className="auth-subtitle auth-verification-prompt">
                Enter the 6-digit verification code sent to <strong>{verificationEmail}</strong>.
              </p>
              <div className="auth-field">
                <label htmlFor="verification-code">Verification Code</label>
                <input
                  id="verification-code"
                  name="verificationCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Enter your 6-digit code"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <button className="auth-button" type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>
          ) : (
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
          )}

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

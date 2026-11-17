import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { googleSignup, verifyEmailCode } from './authService';
import GoogleSignInButton from './components/GoogleSignInButton';
import './Auth.css';

function getRequestErrorMessage(error, fallback) {
  const response = error?.response?.data;
  if (typeof response?.message === 'string') {
    return response.message;
  }
  if (typeof response?.error === 'string') {
    return response.error;
  }
  if (typeof response?.error?.message === 'string') {
    return response.error.message;
  }
  return fallback;
}

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithTokens } = useAuth();
  const location = useLocation();
  const googleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const [form, setForm] = useState({
    email: '',
    password: '',
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

  function navigateAfterLogin(user) {
    const from = location.state?.from;
    const back = from ? `${from.pathname}${from.search || ''}` : null;

    navigate(user.role === 'admin' ? '/admin/dashboard' : back || '/rooms', {
      replace: true,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login({
        email: form.email.trim(),
        password: form.password,
      });
      navigateAfterLogin(user);
    } catch (err) {
      setError(
        getRequestErrorMessage(
          err,
          'Unable to log in. Please check your credentials and try again.'
        )
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
      setError(getRequestErrorMessage(
        err,
        'Unable to continue with Google. Please try again.'
      ));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyGoogleCode(event) {
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
      navigateAfterLogin(data.user);
    } catch (err) {
      setError(getRequestErrorMessage(
        err,
        'Unable to verify your email. Please check the code and try again.'
      ));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <div className="auth-mark" aria-hidden="true">TL</div>
        <p className="auth-brand-name">Tree of Life Hotel</p>
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

          {googleConfigured && !verificationEmail && (
            <>
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in was not completed. Please try again.')}
                text="signin_with"
              />
              <div className="auth-divider"><span>or sign in with email</span></div>
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
            </div>
          )}

          {verificationEmail ? (
            <form className="auth-form" onSubmit={handleVerifyGoogleCode}>
              <p className="auth-subtitle auth-verification-prompt">
                Enter the 6-digit verification code sent to <strong>{verificationEmail}</strong>.
              </p>
              <div className="auth-field">
                <label htmlFor="login-verification-code">Verification Code</label>
                <input
                  id="login-verification-code"
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
                {loading ? 'Verifying...' : 'Verify and Sign In'}
              </button>
            </form>
          ) : (
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
          )}

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { passwordApi } from '../customer/customerService';
import './Auth.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await passwordApi.forgot(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-card">
          <h2>Forgot password</h2>
          {sent ? (
            <div className="auth-message">
              If that email is registered, a reset link is on its way. The link expires in 30 minutes.
            </div>
          ) : (
            <form className="auth-form" onSubmit={submit}>
              {error && <div className="auth-message auth-error">{error}</div>}
              <div className="auth-field">
                <label htmlFor="fp-email">Email address</label>
                <input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <button className="auth-button" disabled={saving}>
                {saving ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
          <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
        </div>
      </section>
    </main>
  );
}
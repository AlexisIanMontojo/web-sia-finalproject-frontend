import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { passwordApi } from '../customer/customerService';
import './Auth.css';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      await passwordApi.reset({ token, ...form });
      navigate('/login', { replace: true });
    } catch (err) {
      setErrors(err.response?.data?.errors || [err.response?.data?.message || 'Could not reset password.']);
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <div className="auth-card">
            <div className="auth-message auth-error">This reset link is missing its token.</div>
            <p className="auth-switch"><Link to="/forgot-password">Request a new link</Link></p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-card">
          <h2>Choose a new password</h2>
          <form className="auth-form" onSubmit={submit}>
            {errors.length > 0 && (
              <div className="auth-message auth-error">{errors.map((m) => <div key={m}>{m}</div>)}</div>
            )}
            <div className="auth-field">
              <label htmlFor="rp-password">New password</label>
              <input id="rp-password" name="password" type="password" value={form.password} onChange={handleChange} required />
            </div>
            <div className="auth-field">
              <label htmlFor="rp-confirm">Confirm password</label>
              <input id="rp-confirm" name="confirm" type="password" value={form.confirm} onChange={handleChange} required />
            </div>
            <button className="auth-button" disabled={saving}>
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
import { useEffect, useState } from 'react';
import { profileApi } from './customerService';
import { toast, showError } from '../../lib/alerts';
import '../../layouts/Customer.css';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [profileErrors, setProfileErrors] = useState([]);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    profileApi.get().then(({ data }) => {
      setProfile(data.user);
      setUsername(data.user.username);
    });
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setProfileErrors([]);
    try {
      const { data } = await profileApi.update({ username });
      setProfile(data.user);
      toast('success', 'Profile updated');
    } catch (err) {
      setProfileErrors(err.response?.data?.errors || [err.response?.data?.message || 'Update failed.']);
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setSaving(true);
    setPasswordErrors([]);
    try {
      await profileApi.changePassword(passwords);
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
      toast('success', 'Password changed');
    } catch (err) {
      setPasswordErrors(err.response?.data?.errors || [err.response?.data?.message || 'Could not change password.']);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <p>Loading…</p>;

  return (
    <section className="stack">
      <h1>My Profile</h1>

      <form className="panel stack" onSubmit={saveProfile}>
        <h3>Personal information</h3>
        {profileErrors.length > 0 && (
          <div className="error-box">{profileErrors.map((m) => <div key={m}>{m}</div>)}</div>
        )}
        <label className="field-label">
          Email
          <input className="input" value={profile.email} disabled />
        </label>
        <label className="field-label">
          Username
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <p className="muted">
          Email status: {profile.email_verified ? 'Verified' : 'Not verified'}
        </p>
        <button className="btn-main" disabled={saving}>Save changes</button>
      </form>

      <form className="panel stack" onSubmit={savePassword}>
        <h3>Change password</h3>
        {passwordErrors.length > 0 && (
          <div className="error-box">{passwordErrors.map((m) => <div key={m}>{m}</div>)}</div>
        )}
        <label className="field-label">
          Current password
          <input className="input" type="password" value={passwords.current_password}
            onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} required />
        </label>
        <label className="field-label">
          New password
          <input className="input" type="password" value={passwords.new_password}
            onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} required />
        </label>
        <label className="field-label">
          Confirm new password
          <input className="input" type="password" value={passwords.confirm_password}
            onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })} required />
        </label>
        <button className="btn-main" disabled={saving}>Change password</button>
      </form>
    </section>
  );
}
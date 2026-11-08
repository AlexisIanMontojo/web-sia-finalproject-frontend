import { useEffect, useMemo, useState } from 'react';
import { customersApi } from '../adminService';
import { toast, showError } from '../../../lib/alerts';
import { useCachedFetch } from '../../../lib/cache';
import { useAuth } from '../../auth/AuthContext';
import { MANAGER_ROLES } from '../../../lib/roles';
import Modal from '../components/Modal';
import '../../../layouts/Admin.css';

const fetchCustomers = async () => {
  const { data } = await customersApi.list();
  return Array.isArray(data?.data) ? data.data : [];
};

export default function CustomersPage() {
  const { user } = useAuth();
  const canEdit = MANAGER_ROLES.includes(user?.role);

  const customerState = useCachedFetch('admin:customers', fetchCustomers);
  const rows = customerState.data ?? [];

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: '', is_active: true });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customerState.error) {
      showError('Could not load customers', customerState.error.response?.data?.message || 'Try again.');
    }
  }, [customerState.error]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        !q ||
        r.username.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
    );
  }, [rows, search]);

  function openEdit(row) {
    if (!canEdit) return;
    setForm({ username: row.username, is_active: row.is_active });
    setErrors({});
    setEditing(row);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const { data } = await customersApi.update(editing.id, form);
      const saved = data.data;

      customerState.setData((prev) =>
        (prev ?? []).map((r) => (r.id === saved.id ? saved : r))
      );

      toast('success', 'Customer updated');
      setEditing(null);
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors({ form: err.response.data.errors || [err.response.data.message] });
      } else {
        showError('Save failed', err.response?.data?.message || 'Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  const loading = customerState.loading;

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Customers</h1>
          <p className="admin-page-subtitle">
            {rows.length} registered customer{rows.length === 1 ? '' : 's'}
            {!canEdit && ' · view only'}
          </p>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="input search"
          placeholder="Search by username or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-card">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">No customers found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Email verified</th>
                <th>Joined</th>
                <th>Account</th>
                {canEdit && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.username}</strong>
                  </td>
                  <td>{row.email}</td>
                  <td>
                    <span className={`badge ${row.email_verified ? 'badge-green' : 'badge-amber'}`}>
                      {row.email_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td>{new Date(row.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${row.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {row.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="text-right">
                      <button className="btn btn-ghost" onClick={() => openEdit(row)}>
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && canEdit && (
        <Modal title="Edit Customer" onClose={() => !saving && setEditing(null)}>
          <form onSubmit={handleSave}>
            {errors.form && (
              <div className="auth-message auth-error" role="alert">
                {(Array.isArray(errors.form) ? errors.form : [errors.form]).map((m) => (
                  <div key={m}>{m}</div>
                ))}
              </div>
            )}

            <label className="field">
              <span>Email</span>
              <input className="input" value={editing.email} disabled />
            </label>

            <label className="field">
              <span>Username</span>
              <input
                name="username"
                className="input"
                value={form.username}
                onChange={handleChange}
                required
              />
            </label>

            <label className="checkbox-row">
              <input
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange}
              />
              <span>Account active (disabled customers cannot log in)</span>
            </label>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
import { useEffect, useMemo, useState } from 'react';
import { customersApi } from '../adminService';
import { toast, showError } from '../../../lib/alerts';
import Modal from '../components/Modal';
import '../../../layouts/Admin.css';

export default function CustomersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: '', is_active: true });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await customersApi.list();
      setRows(data.data);
    } catch (err) {
      showError('Could not load customers', err.response?.data?.message || 'Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      !q || r.username.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  }, [rows, search]);

  function openEdit(row) {
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
      await customersApi.update(editing.id, form);
      toast('success', 'Customer updated');
      setEditing(null);
      load();
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else showError('Save failed', err.response?.data?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Customers</h1>
          <p className="admin-page-subtitle">{rows.length} registered customer{rows.length === 1 ? '' : 's'}</p>
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
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.username}</strong></td>
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
                  <td className="text-right">
                    <button className="btn btn-ghost" onClick={() => openEdit(row)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title="Edit Customer" onClose={() => !saving && setEditing(null)}>
          <form onSubmit={handleSave}>
            <label className="field">
              <span>Email</span>
              <input className="input" value={editing.email} disabled />
            </label>

            <label className="field">
              <span>Username</span>
              <input name="username" className="input" value={form.username} onChange={handleChange} required />
              {errors.username && <small className="field-error">{errors.username}</small>}
            </label>

            <label className="checkbox-row">
              <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleChange} />
              <span>Account active (disabled customers cannot log in)</span>
            </label>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
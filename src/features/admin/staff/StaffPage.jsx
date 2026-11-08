import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { staffApi } from '../adminService';
import { toast, showError } from '../../../lib/alerts';
import { useCachedFetch, invalidate } from '../../../lib/cache';
import Modal from '../components/Modal';
import '../../../layouts/Admin.css';

const ROLE_LABEL = { manager: 'Manager', staff: 'Front desk staff' };
const ROLE_BADGE = { manager: 'badge-amber', staff: 'badge-green' };

const EMPTY_CREATE = { username: '', email: '', password: '', role: 'staff' };
const EMPTY_EDIT = { username: '', role: 'staff', is_active: true };

const fetchStaff = async () => {
  const { data } = await staffApi.list();
  return Array.isArray(data?.data) ? data.data : [];
};

export default function StaffPage() {
  const state = useCachedFetch('admin:staff', fetchStaff);
  const rows = state.data ?? [];

  const [modal, setModal] = useState(null); // null | { mode: 'create' } | { mode: 'edit', row }
  const [form, setForm] = useState(EMPTY_CREATE);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.error) {
      showError('Could not load accounts', state.error.response?.data?.message || 'Try again.');
    }
  }, [state.error]);

  function openCreate() {
    setForm(EMPTY_CREATE);
    setErrors([]);
    setModal({ mode: 'create' });
  }

  function openEdit(row) {
    setForm({ username: row.username, role: row.role, is_active: row.is_active });
    setErrors([]);
    setModal({ mode: 'edit', row });
  }

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);

    try {
      if (modal.mode === 'create') {
        await staffApi.create(form);
        toast('success', 'Account created');
      } else {
        await staffApi.update(modal.row.id, form);
        toast('success', 'Account updated');
      }
      invalidate('admin:staff');
      setModal(null);
      state.refresh();
    } catch (err) {
      setErrors(err.response?.data?.errors || [err.response?.data?.message || 'Could not save.']);
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(row) {
    const result = await Swal.fire({
      icon: 'question',
      title: `New password for ${row.username}`,
      input: 'password',
      inputPlaceholder: 'At least 8 characters',
      inputAttributes: { autocomplete: 'new-password' },
      inputValidator: (v) => (v.length < 8 ? 'Use at least 8 characters.' : null),
      showCancelButton: true,
      confirmButtonText: 'Set password',
      confirmButtonColor: '#174d38',
    });
    if (!result.isConfirmed) return;

    try {
      await staffApi.resetPassword(row.id, result.value);
      toast('success', 'Password reset. The user must sign in again.');
    } catch (err) {
      showError('Could not reset', err.response?.data?.message || 'Try again.');
    }
  }

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Staff and Managers</h1>
          <p className="admin-page-subtitle">
            Create accounts for managers and front desk staff. Only you can see this page.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New account</button>
      </div>

      <div className="table-card">
        {state.loading && !state.data ? (
          <div className="table-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="table-empty">No manager or staff accounts yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.username}</strong></td>
                  <td>{row.email}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[row.role] || 'badge-gray'}`}>
                      {ROLE_LABEL[row.role] || row.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${row.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {row.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>{row.created_at?.slice(0, 10)}</td>
                  <td className="text-right">
                    <button className="btn btn-ghost" onClick={() => openEdit(row)}>Edit</button>
                    <button className="btn btn-ghost" onClick={() => resetPassword(row)}>Reset password</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'New account' : 'Edit account'}
          onClose={() => !saving && setModal(null)}
        >
          <form onSubmit={save}>
            {errors.length > 0 && (
              <div className="auth-message auth-error" role="alert">
                {errors.map((m) => (
                  <div key={m}>{m}</div>
                ))}
              </div>
            )}

            <label className="field">
              <span>Username</span>
              <input name="username" className="input" value={form.username} onChange={onChange} required />
            </label>

            {modal.mode === 'create' && (
              <>
                <label className="field">
                  <span>Email</span>
                  <input name="email" type="email" className="input" value={form.email} onChange={onChange} required />
                </label>
                <label className="field">
                  <span>Temporary password</span>
                  <input name="password" type="password" className="input" value={form.password} onChange={onChange} required />
                </label>
              </>
            )}

            <label className="field">
              <span>Role</span>
              <select name="role" className="input" value={form.role} onChange={onChange}>
                <option value="staff">Front desk staff</option>
                <option value="manager">Manager</option>
              </select>
            </label>

            {modal.mode === 'edit' && (
              <label className="checkbox-row">
                <input name="is_active" type="checkbox" checked={form.is_active} onChange={onChange} />
                <span>Active (disabled accounts cannot sign in)</span>
              </label>
            )}

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>
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
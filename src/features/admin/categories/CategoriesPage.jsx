import { useEffect, useMemo, useState } from 'react';
import { categoriesApi } from '../adminService';
import { toast, showError, confirmDelete } from '../../../lib/alerts';
import { useCachedFetch, invalidate } from '../../../lib/cache';
import Modal from '../components/Modal';
import '../../../layouts/Admin.css';

const EMPTY_FORM = {
  name: '',
  description: '',
  max_occupancy: 2,
  amenities: '',
  is_active: true,
};

const fetchCategories = async () => {
  const { data } = await categoriesApi.list();
  return Array.isArray(data?.data) ? data.data : [];
};

export default function CategoriesPage() {
  const categoryState = useCachedFetch('admin:categories', fetchCategories);
  const rows = categoryState.data ?? [];

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (categoryState.error) {
      showError('Could not load categories', categoryState.error.response?.data?.message || 'Try again.');
    }
  }, [categoryState.error]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setModal({ mode: 'create' });
  }

  function openEdit(row) {
    setForm({
      name: row.name,
      description: row.description || '',
      max_occupancy: row.max_occupancy,
      amenities: row.amenities.join(', '),
      is_active: row.is_active,
    });
    setErrors({});
    setModal({ mode: 'edit', id: row.id });
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      ...form,
      max_occupancy: Number(form.max_occupancy),
      amenities: form.amenities.split(',').map((s) => s.trim()).filter(Boolean),
    };

    try {
      const res =
        modal.mode === 'create'
          ? await categoriesApi.create(payload)
          : await categoriesApi.update(modal.id, payload);

      const saved = res.data.data;

      categoryState.setData((prev) => {
        const list = prev ?? [];
        return modal.mode === 'create'
          ? [...list, saved].sort((a, b) => a.name.localeCompare(b.name))
          : list.map((r) => (r.id === saved.id ? saved : r));
      });

      // Rooms and Pricing show category names, so they must refetch.
      invalidate('admin:categories');
      invalidate('admin:rooms');

      toast('success', modal.mode === 'create' ? 'Category created' : 'Category updated');
      setModal(null);
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

  async function handleDelete(row) {
    const ok = await confirmDelete(row.name);
    if (!ok) return;

    try {
      await categoriesApi.remove(row.id);
      categoryState.setData((prev) => (prev ?? []).filter((r) => r.id !== row.id));
      invalidate('admin:rooms');
      toast('success', 'Category deleted');
    } catch (err) {
      showError('Cannot delete', err.response?.data?.message || 'Something went wrong.');
    }
  }

  const loading = categoryState.loading;

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Room Categories</h1>
          <p className="admin-page-subtitle">
            {rows.length} categor{rows.length === 1 ? 'y' : 'ies'} total
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Category</button>
      </div>

      <div className="toolbar">
        <input
          className="input search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-card">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">No categories found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Max Occupancy</th>
                <th>Amenities</th>
                <th>Rooms</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    {row.description && <div className="muted">{row.description}</div>}
                  </td>
                  <td>{row.max_occupancy} guests</td>
                  <td>
                    <div className="chip-list">
                      {row.amenities.length
                        ? row.amenities.map((a) => <span className="chip" key={a}>{a}</span>)
                        : <span className="muted">None</span>}
                    </div>
                  </td>
                  <td>{row.room_count}</td>
                  <td>
                    <span className={`badge ${row.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {row.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="btn btn-ghost" onClick={() => openEdit(row)}>Edit</button>
                    <button className="btn btn-danger-ghost" onClick={() => handleDelete(row)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'New Category' : 'Edit Category'}
          onClose={() => !saving && setModal(null)}
        >
          <form onSubmit={handleSave}>
            {errors.form && (
              <div className="auth-message auth-error" role="alert">
                {(Array.isArray(errors.form) ? errors.form : [errors.form]).map((m) => (
                  <div key={m}>{m}</div>
                ))}
              </div>
            )}

            <label className="field">
              <span>Name</span>
              <input name="name" className="input" value={form.name} onChange={handleChange} required />
            </label>

            <label className="field">
              <span>Description</span>
              <textarea name="description" className="input" rows={3} value={form.description} onChange={handleChange} />
            </label>

            <label className="field">
              <span>Maximum occupancy</span>
              <input
                name="max_occupancy"
                type="number"
                min="1"
                className="input"
                value={form.max_occupancy}
                onChange={handleChange}
                required
              />
            </label>

            <label className="field">
              <span>Amenities (comma separated)</span>
              <input
                name="amenities"
                className="input"
                placeholder="WiFi, Air conditioning, Minibar"
                value={form.amenities}
                onChange={handleChange}
              />
            </label>

            <label className="checkbox-row">
              <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleChange} />
              <span>Active (visible for booking)</span>
            </label>

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
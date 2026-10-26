import { useEffect, useMemo, useState } from 'react';
import { pricingApi, categoriesApi } from '../adminService';
import { toast, showError, confirmDelete } from '../../../lib/alerts';
import Modal from '../components/Modal';
import '../../../layouts/Admin.css';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

// Local calendar date (YYYY-MM-DD), so the date doesn't shift near midnight.
function localToday() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function isCurrent(p) {
  const today = localToday();
  return (
    p.is_active &&
    p.effective_from <= today &&
    (!p.effective_until || p.effective_until >= today)
  );
}

const EMPTY = {
  category_id: '',
  nightly_rate: '',
  extra_guest_charge: 0,
  cleaning_fee: 0,
  effective_from: localToday(),
  effective_until: '',
  is_active: true,
};

export default function PricingPage() {
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [priceRes, catRes] = await Promise.all([pricingApi.list(), categoriesApi.list()]);
      setRows(Array.isArray(priceRes.data?.data) ? priceRes.data.data : []);
      setCategories(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
    } catch (err) {
      showError(
        'Could not load pricing',
        err.response?.data?.message || 'Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) => !q || (r.category_name || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  function openCreate() {
    setForm({ ...EMPTY, category_id: categories[0]?.id ?? '' });
    setErrors({});
    setModal({ mode: 'create' });
  }

  function openEdit(row) {
    setForm({
      category_id: row.category_id,
      nightly_rate: row.nightly_rate,
      extra_guest_charge: row.extra_guest_charge,
      cleaning_fee: row.cleaning_fee,
      effective_from: row.effective_from,
      effective_until: row.effective_until || '',
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
      category_id: Number(form.category_id),
      nightly_rate: Number(form.nightly_rate),
      extra_guest_charge: Number(form.extra_guest_charge || 0),
      cleaning_fee: Number(form.cleaning_fee || 0),
      effective_from: form.effective_from,
      effective_until: form.effective_until || null,
      is_active: form.is_active,
    };

    try {
      if (modal.mode === 'create') {
        await pricingApi.create(payload);
        toast('success', 'Price created');
      } else {
        await pricingApi.update(modal.id, payload);
        toast('success', 'Price updated');
      }
      setModal(null);
      load();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors({ form: err.response.data.errors });
      } else {
        showError('Save failed', err.response?.data?.message || 'Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    const ok = await confirmDelete(`${row.category_name} price from ${row.effective_from}`);
    if (!ok) return;

    try {
      await pricingApi.remove(row.id);
      toast('success', 'Price deleted');
      load();
    } catch (err) {
      showError('Cannot delete', err.response?.data?.message || 'Something went wrong.');
    }
  }

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Room Pricing</h1>
          <p className="admin-page-subtitle">Rates per category, by date range</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} disabled={categories.length === 0}>
          + New Price
        </button>
      </div>

      <div className="toolbar">
        <input
          className="input search"
          placeholder="Search by category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-card">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">No prices yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Nightly rate</th>
                <th>Extra guest</th>
                <th>Cleaning</th>
                <th>Period</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.category_name}</strong>
                  </td>
                  <td>{peso.format(row.nightly_rate)}</td>
                  <td>{peso.format(row.extra_guest_charge)}</td>
                  <td>{peso.format(row.cleaning_fee)}</td>
                  <td>
                    {row.effective_from} → {row.effective_until || 'Open-ended'}
                  </td>
                  <td>
                    {!row.is_active ? (
                      <span className="badge badge-gray">Inactive</span>
                    ) : isCurrent(row) ? (
                      <span className="badge badge-green">Current</span>
                    ) : (
                      <span className="badge badge-amber">Scheduled / ended</span>
                    )}
                  </td>
                  <td className="text-right">
                    <button className="btn btn-ghost" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button className="btn btn-danger-ghost" onClick={() => handleDelete(row)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'New Price' : 'Edit Price'}
          onClose={() => !saving && setModal(null)}
        >
          <form onSubmit={handleSave}>
            {errors.form && (
              <div className="auth-message auth-error" role="alert">
                {errors.form.map((m) => (
                  <div key={m}>{m}</div>
                ))}
              </div>
            )}

            <label className="field">
              <span>Category</span>
              <select
                name="category_id"
                className="input"
                value={form.category_id}
                onChange={handleChange}
                required
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Nightly rate (₱)</span>
              <input
                name="nightly_rate"
                type="number"
                min="0.01"
                step="0.01"
                className="input"
                value={form.nightly_rate}
                onChange={handleChange}
                required
              />
            </label>

            <div className="form-row">
              <label className="field">
                <span>Extra guest charge (₱)</span>
                <input
                  name="extra_guest_charge"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={form.extra_guest_charge}
                  onChange={handleChange}
                />
              </label>
              <label className="field">
                <span>Cleaning fee (₱)</span>
                <input
                  name="cleaning_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={form.cleaning_fee}
                  onChange={handleChange}
                />
              </label>
            </div>

            <div className="form-row">
              <label className="field">
                <span>Effective from</span>
                <input
                  name="effective_from"
                  type="date"
                  className="input"
                  value={form.effective_from}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="field">
                <span>Effective until</span>
                <input
                  name="effective_until"
                  type="date"
                  className="input"
                  value={form.effective_until}
                  onChange={handleChange}
                />
              </label>
            </div>

            <label className="checkbox-row">
              <input
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange}
              />
              <span>Active</span>
            </label>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setModal(null)}
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
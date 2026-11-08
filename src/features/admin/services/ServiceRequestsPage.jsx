import { useEffect, useState } from 'react';
import { serviceRequestsApi, serviceCatalogApi } from '../adminService';
import { toast, showError } from '../../../lib/alerts';
import { useAuth } from '../../auth/AuthContext';
import { MANAGER_ROLES } from '../../../lib/roles';
import Modal from '../components/Modal';
import '../../../layouts/Admin.css';
import '../../../layouts/Messages.css';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const FILTERS = [
  { value: 'requested', label: 'Requested' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];

const STATUS_TAG = {
  requested: 'tag-unread',
  confirmed: 'tag-ok',
  completed: '',
  cancelled: 'tag-warn',
};

const CATEGORIES = [
  ['laundry', 'Laundry'],
  ['food', 'Food'],
  ['spa', 'Spa'],
  ['meeting', 'Meeting room'],
  ['other', 'Other'],
];

const UNITS = [
  ['per_item', 'Per piece'],
  ['per_person', 'Per guest'],
  ['per_hour', 'Per hour'],
  ['per_stay', 'Per stay'],
  ['per_kilo', 'Per kilo'],
];

const EMPTY_SERVICE = {
  name: '',
  description: '',
  category: 'laundry',
  unit: 'per_item',
  price: '',
  requires_schedule: false,
  duration_minutes: 60,
  capacity: 1,
  is_active: true,
};

function formatQuantity(q, unit) {
  return unit === 'per_kilo' ? `${Number(q).toFixed(2)} kg` : q;
}

export default function ServiceRequestsPage() {
  const { user } = useAuth();
  const canManage = MANAGER_ROLES.includes(user?.role);

  const [tab, setTab] = useState('requests');

  const [filter, setFilter] = useState('requested');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_SERVICE);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  async function loadRequests(status = filter) {
    setLoading(true);
    try {
      const { data } = await serviceRequestsApi.list(status);
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      showError('Could not load requests', err.response?.data?.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalog() {
    setCatalogLoading(true);
    try {
      const { data } = await serviceCatalogApi.list();
      setCatalog(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      showError('Could not load services', err.response?.data?.message || 'Try again.');
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    loadRequests(filter);
  }, [filter]);

  useEffect(() => {
    if (tab === 'catalogue' && canManage) loadCatalog();
  }, [tab]);

  async function act(row, action) {
    setBusyId(row.id);
    try {
      if (action === 'confirm') await serviceRequestsApi.confirm(row.id);
      if (action === 'complete') await serviceRequestsApi.complete(row.id);
      if (action === 'billed') await serviceRequestsApi.billed(row.id);
      toast('success', 'Updated');
      await loadRequests(filter);
    } catch (err) {
      showError('Could not update', err.response?.data?.message || 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  function openCreate() {
    setForm(EMPTY_SERVICE);
    setErrors([]);
    setModal({ mode: 'create' });
  }

  function openEdit(row) {
    setForm({
      name: row.name,
      description: row.description || '',
      category: row.category,
      unit: row.unit,
      price: row.price,
      requires_schedule: row.requires_schedule,
      duration_minutes: row.duration_minutes,
      capacity: row.capacity,
      is_active: row.is_active,
    });
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

    const payload = {
      ...form,
      price: Number(form.price),
      duration_minutes: Number(form.duration_minutes),
      capacity: Number(form.capacity),
    };

    try {
      if (modal.mode === 'create') {
        await serviceCatalogApi.create(payload);
        toast('success', 'Service added');
      } else {
        await serviceCatalogApi.update(modal.row.id, payload);
        toast('success', 'Service saved');
      }
      setModal(null);
      await loadCatalog();
    } catch (err) {
      setErrors(err.response?.data?.errors || [err.response?.data?.message || 'Could not save.']);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Extra Services</h1>
          <p className="admin-page-subtitle">
            Confirm and complete guest requests. Managers also set the services offered and mark them paid.
          </p>
        </div>
      </div>

      {canManage && (
        <div className="toolbar">
          <button
            className={`btn ${tab === 'requests' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('requests')}
          >
            Requests
          </button>
          <button
            className={`btn ${tab === 'catalogue' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('catalogue')}
          >
            Services offered
          </button>
        </div>
      )}

      {tab === 'requests' && (
        <>
          <div className="toolbar">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="table-card">
            {loading ? (
              <div className="table-empty">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="table-empty">No requests here.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Service</th>
                    <th>Schedule</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Billing</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.guest_name}</strong>
                        <div className="muted">
                          {r.reservation_code} · Room {r.room_number}
                        </div>
                      </td>
                      <td>{r.name}</td>
                      <td>
                        {r.scheduled_at ? (
                          <>
                            {r.scheduled_at.slice(0, 16)}
                            <div className="muted">until {r.ends_at?.slice(11, 16)}</div>
                          </>
                        ) : (
                          <span className="muted">No time needed</span>
                        )}
                      </td>
                      <td>{formatQuantity(r.quantity, r.unit)}</td>
                      <td>{peso.format(r.total_amount)}</td>
                      <td>
                        <span className={`tag ${STATUS_TAG[r.status] || ''}`}>{r.status}</span>
                      </td>
                      <td>
                        <span className={`tag ${r.billing_status === 'paid' ? 'tag-ok' : ''}`}>
                          {r.billing_status}
                        </span>
                      </td>
                      <td className="text-right">
                        {r.status === 'requested' && (
                          <button
                            className="btn btn-primary"
                            disabled={busyId === r.id}
                            onClick={() => act(r, 'confirm')}
                          >
                            Confirm
                          </button>
                        )}
                        {r.status === 'confirmed' && (
                          <button
                            className="btn btn-ghost"
                            disabled={busyId === r.id}
                            onClick={() => act(r, 'complete')}
                          >
                            Complete
                          </button>
                        )}
                        {canManage && r.status === 'completed' && r.billing_status === 'unpaid' && (
                          <button
                            className="btn btn-primary"
                            disabled={busyId === r.id}
                            onClick={() => act(r, 'billed')}
                          >
                            Mark paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'catalogue' && canManage && (
        <>
          <div className="admin-page-header">
            <div />
            <button className="btn btn-primary" onClick={openCreate}>+ New service</button>
          </div>

          <div className="table-card">
            {catalogLoading ? (
              <div className="table-empty">Loading…</div>
            ) : catalog.length === 0 ? (
              <div className="table-empty">No services yet.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Unit</th>
                    <th>Scheduled</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.name}</strong>
                        {s.description && <div className="muted">{s.description}</div>}
                      </td>
                      <td>{CATEGORIES.find((c) => c[0] === s.category)?.[1] || s.category}</td>
                      <td>{peso.format(s.price)}</td>
                      <td>{UNITS.find((u) => u[0] === s.unit)?.[1] || s.unit}</td>
                      <td>{s.requires_schedule ? 'Yes' : 'No'}</td>
                      <td>{s.capacity}</td>
                      <td>
                        <span className={`tag ${s.is_active ? 'tag-ok' : ''}`}>
                          {s.is_active ? 'Offered' : 'Hidden'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button className="btn btn-ghost" onClick={() => openEdit(s)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {modal && (
            <Modal
              title={modal.mode === 'create' ? 'New service' : 'Edit service'}
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
                  <span>Name</span>
                  <input name="name" className="input" value={form.name} onChange={onChange} required />
                </label>

                <label className="field">
                  <span>Description</span>
                  <textarea name="description" rows={2} className="input" value={form.description} onChange={onChange} />
                </label>

                <div className="form-row">
                  <label className="field">
                    <span>Category</span>
                    <select name="category" className="input" value={form.category} onChange={onChange}>
                      {CATEGORIES.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Pricing unit</span>
                    <select name="unit" className="input" value={form.unit} onChange={onChange}>
                      {UNITS.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="form-row">
                  <label className="field">
                    <span>Price (₱)</span>
                    <input name="price" type="number" min="0" step="0.01" className="input" value={form.price} onChange={onChange} required />
                  </label>
                  <label className="field">
                    <span>Capacity at one time</span>
                    <input name="capacity" type="number" min="1" max="50" className="input" value={form.capacity} onChange={onChange} required />
                  </label>
                </div>

                <label className="checkbox-row">
                  <input name="requires_schedule" type="checkbox" checked={form.requires_schedule} onChange={onChange} />
                  <span>Needs a date and time (for example, a massage or a meeting room)</span>
                </label>

                {form.requires_schedule && form.unit !== 'per_hour' && (
                  <label className="field">
                    <span>Duration (minutes)</span>
                    <input name="duration_minutes" type="number" min="15" max="480" className="input" value={form.duration_minutes} onChange={onChange} />
                  </label>
                )}

                <label className="checkbox-row">
                  <input name="is_active" type="checkbox" checked={form.is_active} onChange={onChange} />
                  <span>Offered to guests</span>
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
        </>
      )}
    </section>
  );
}
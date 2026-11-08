import { useEffect, useMemo, useRef, useState } from 'react';
import { roomsApi, categoriesApi } from '../adminService';
import { toast, showError, confirmDelete } from '../../../lib/alerts';
import { useCachedFetch } from '../../../lib/cache';
import Modal from '../components/Modal';
import '../../../layouts/Admin.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const STATUSES = [
  { value: 'available', label: 'Available', badge: 'badge-green' },
  { value: 'maintenance', label: 'Maintenance', badge: 'badge-red' },
  { value: 'out_of_service', label: 'Out of service', badge: 'badge-gray' },
];

const EMPTY = {
  room_number: '',
  category_id: '',
  description: '',
  floor_number: '',
  capacity: 2,
  status: 'available',
  image_url: '',
  is_active: true,
};

// Defined once, outside the component, so the cache hook keeps a stable reference.
const fetchRooms = async () => {
  const { data } = await roomsApi.list();
  return Array.isArray(data?.data) ? data.data : [];
};

const fetchCategories = async () => {
  const { data } = await categoriesApi.list();
  return Array.isArray(data?.data) ? data.data : [];
};

function imageSrc(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

export default function RoomsPage() {
  const roomState = useCachedFetch('admin:rooms', fetchRooms);
  const categoryState = useCachedFetch('admin:categories', fetchCategories);

  const rows = roomState.data ?? [];
  const categories = categoryState.data ?? [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    if (roomState.error) {
      showError('Could not load rooms', roomState.error.response?.data?.message || 'Try again.');
    }
  }, [roomState.error]);

  // Free the preview URL when it changes.
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!q ||
          (r.room_number || '').toLowerCase().includes(q) ||
          (r.category_name || '').toLowerCase().includes(q)) &&
        (!statusFilter || r.status === statusFilter)
    );
  }, [rows, search, statusFilter]);

  function statusMeta(value) {
    return STATUSES.find((s) => s.value === value) || STATUSES[0];
  }

  function resetImage() {
    setImageFile(null);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  function openCreate() {
    setForm({ ...EMPTY, category_id: categories[0]?.id ?? '' });
    setErrors({});
    resetImage();
    setModal({ mode: 'create' });
  }

  function openEdit(row) {
    setForm({
      room_number: row.room_number,
      category_id: row.category_id,
      description: row.description || '',
      floor_number: row.floor_number ?? '',
      capacity: row.capacity,
      status: row.status,
      image_url: row.image_url || '',
      is_active: row.is_active,
    });
    setErrors({});
    resetImage();
    setPreview(row.image_url ? imageSrc(row.image_url) : null);
    setModal({ mode: 'edit', id: row.id });
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showError('Unsupported file', 'Choose a JPG, PNG, or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showError('File too large', 'The image must be 3 MB or smaller.');
      e.target.value = '';
      return;
    }

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      let imagePath = form.image_url || null;

      if (imageFile) {
        const { data: uploaded } = await roomsApi.uploadImage(imageFile);
        imagePath = uploaded.image_url;
      }

      const payload = {
        ...form,
        category_id: Number(form.category_id),
        capacity: Number(form.capacity),
        floor_number: form.floor_number === '' ? null : Number(form.floor_number),
        image_url: imagePath,
      };

      const res =
        modal.mode === 'create'
          ? await roomsApi.create(payload)
          : await roomsApi.update(modal.id, payload);

      const saved = res.data.data;

      // Update the list in place. No reload, so the page stays instant.
      roomState.setData((prev) => {
        const list = prev ?? [];
        return modal.mode === 'create'
          ? [saved, ...list]
          : list.map((r) => (r.id === saved.id ? saved : r));
      });

      toast('success', modal.mode === 'create' ? 'Room created' : 'Room updated');
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
    const ok = await confirmDelete(row.room_number);
    if (!ok) return;

    try {
      await roomsApi.remove(row.id);
      roomState.setData((prev) => (prev ?? []).filter((r) => r.id !== row.id));
      toast('success', 'Room deleted');
    } catch (err) {
      showError('Cannot delete', err.response?.data?.message || 'Something went wrong.');
    }
  }

  const loading = roomState.loading;

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Room Management</h1>
          <p className="admin-page-subtitle">
            {rows.length} room{rows.length === 1 ? '' : 's'} total
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} disabled={categories.length === 0}>
          + New Room
        </button>
      </div>

      {categories.length === 0 && !categoryState.loading && (
        <div className="auth-message auth-error">Create a room category first.</div>
      )}

      <div className="toolbar">
        <input
          className="input search"
          placeholder="Search room or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">No rooms found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Room</th>
                <th>Category</th>
                <th>Floor</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Active</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const meta = statusMeta(row.status);
                return (
                  <tr key={row.id}>
                    <td>
                      {row.image_url ? (
                        <img
                          src={imageSrc(row.image_url)}
                          alt={`Room ${row.room_number}`}
                          loading="lazy"
                          className="thumb"
                        />
                      ) : (
                        <span className="muted">No photo</span>
                      )}
                    </td>
                    <td>
                      <strong>{row.room_number}</strong>
                    </td>
                    <td>{row.category_name}</td>
                    <td>{row.floor_number ?? '—'}</td>
                    <td>{row.capacity} guests</td>
                    <td>
                      <span className={`badge ${meta.badge}`}>{meta.label}</span>
                    </td>
                    <td>{row.is_active ? 'Yes' : 'No'}</td>
                    <td className="text-right">
                      <button className="btn btn-ghost" onClick={() => openEdit(row)}>
                        Edit
                      </button>
                      <button className="btn btn-danger-ghost" onClick={() => handleDelete(row)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'New Room' : 'Edit Room'}
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

            <div className="field">
              <span>Room photo</span>
              <div className="photo-picker">
                {preview ? (
                  <img src={preview} alt="Room preview" className="photo-preview" />
                ) : (
                  <span className="muted">No photo selected</span>
                )}

                <div className="photo-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => fileInput.current?.click()}
                  >
                    {preview ? 'Change photo' : 'Upload image'}
                  </button>
                  {preview && (
                    <button type="button" className="btn btn-danger-ghost" onClick={resetImage}>
                      Remove
                    </button>
                  )}
                </div>

                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFile}
                  hidden
                />
                <small className="muted">JPG, PNG, or WebP, up to 3 MB.</small>
              </div>
            </div>

            <label className="field">
              <span>Room number</span>
              <input
                name="room_number"
                className="input"
                value={form.room_number}
                onChange={handleChange}
                required
              />
            </label>

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

            <div className="form-row">
              <label className="field">
                <span>Floor</span>
                <input
                  name="floor_number"
                  type="number"
                  className="input"
                  value={form.floor_number}
                  onChange={handleChange}
                />
              </label>
              <label className="field">
                <span>Capacity</span>
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  max="20"
                  className="input"
                  value={form.capacity}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>Status</span>
              <select name="status" className="input" value={form.status} onChange={handleChange}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Description</span>
              <textarea
                name="description"
                rows={3}
                className="input"
                value={form.description}
                onChange={handleChange}
              />
            </label>

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
import { useEffect, useMemo, useState } from 'react';
import { adminReviewsApi } from '../adminService';
import { toast, showError } from '../../../lib/alerts';
import StarRating from '../../../components/StarRating';
import '../../../layouts/Admin.css';

const FILTERS = [
  { value: 'all', label: 'All reviews' },
  { value: 'visible', label: 'Shown' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'featured', label: 'Featured' },
];

export default function ReviewsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminReviewsApi.list();
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      showError('Could not load reviews', err.response?.data?.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'visible') return r.is_visible;
      if (filter === 'hidden') return !r.is_visible;
      if (filter === 'featured') return r.is_featured;
      return true;
    });
  }, [rows, filter]);

  async function update(row, patch) {
    const next = {
      is_visible: row.is_visible,
      is_featured: row.is_featured,
      ...patch,
    };

    setBusyId(row.id);
    try {
      await adminReviewsApi.update(row.id, next);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...next } : r)));
      toast('success', 'Review updated');
    } catch (err) {
      showError('Could not update', err.response?.data?.message || 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Reviews</h1>
          <p className="admin-page-subtitle">
            Show or hide guest reviews, and feature the best ones as testimonials on the hotel page.
          </p>
        </div>
      </div>

      <div className="toolbar">
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : shown.length === 0 ? (
          <div className="table-empty">No reviews here yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Room</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Show</th>
                <th>Feature</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.guest_name}</strong>
                    <div className="muted">{row.guest_email}</div>
                    <div className="muted">{row.reservation_code}</div>
                  </td>
                  <td>
                    {row.room_number}
                    <div className="muted">{row.category_name}</div>
                  </td>
                  <td>
                    <StarRating value={row.rating} size="sm" />
                  </td>
                  <td className="review-comment">{row.comment || <span className="muted">No comment</span>}</td>
                  <td>{row.created_at?.slice(0, 10)}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.is_visible}
                      disabled={busyId === row.id}
                      onChange={(e) => update(row, { is_visible: e.target.checked })}
                      aria-label="Show this review"
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.is_featured}
                      disabled={busyId === row.id || !row.is_visible}
                      onChange={(e) => update(row, { is_featured: e.target.checked })}
                      aria-label="Feature this review"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
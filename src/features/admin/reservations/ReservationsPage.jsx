import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { reservationsApi } from '../adminService';
import { toast, showError } from '../../../lib/alerts';
import '../../../layouts/Admin.css';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: '', label: 'All' },
];

const STATUS_BADGE = {
  pending: 'badge-amber',
  confirmed: 'badge-green',
  checked_in: 'badge-red',
  checked_out: 'badge-gray',
  cancelled: 'badge-gray',
  rejected: 'badge-gray',
};

export default function ReservationsPage() {
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load(status = tab) {
    setLoading(true);
    try {
      const { data } = await reservationsApi.list(status);
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      showError('Could not load reservations', err.response?.data?.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(tab);
  }, [tab]);

  async function confirm(row) {
    const result = await Swal.fire({
      icon: 'question',
      title: `Confirm ${row.reservation_code}?`,
      text: `Room ${row.room_number}, ${row.check_in_date} to ${row.check_out_date}.`,
      showCancelButton: true,
      confirmButtonText: 'Confirm booking',
      confirmButtonColor: '#174d38',
    });
    if (!result.isConfirmed) return;

    setBusyId(row.id);
    try {
      await reservationsApi.confirm(row.id);
      toast('success', 'Reservation confirmed');
      load();
    } catch (err) {
      showError('Cannot confirm', err.response?.data?.message || 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(row) {
    const result = await Swal.fire({
      icon: 'warning',
      title: `Reject ${row.reservation_code}?`,
      text: 'The room will be released for these dates.',
      input: 'text',
      inputLabel: 'Reason (shown to the guest)',
      inputPlaceholder: 'e.g. Room unavailable for these dates',
      inputValidator: (value) => (value.trim().length < 3 ? 'Please enter a reason.' : null),
      showCancelButton: true,
      confirmButtonText: 'Reject booking',
      confirmButtonColor: '#b91c1c',
    });
    if (!result.isConfirmed) return;

    setBusyId(row.id);
    try {
      await reservationsApi.reject(row.id, result.value.trim());
      toast('success', 'Reservation rejected');
      load();
    } catch (err) {
      showError('Cannot reject', err.response?.data?.message || 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Reservations</h1>
          <p className="admin-page-subtitle">
            Confirm or reject pending bookings. Confirmed and checked-in stays hold their rooms.
          </p>
        </div>
      </div>

      <div className="toolbar">
        {TABS.map((t) => (
          <button
            key={t.value || 'all'}
            className={`btn ${tab === t.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="table-card">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="table-empty">No reservations here.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Guest</th>
                <th>Room</th>
                <th>Stay</th>
                <th>Guests</th>
                <th>Total</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.reservation_code}</strong></td>
                  <td>
                    {r.guest_name}
                    <div className="muted">{r.guest_email}</div>
                  </td>
                  <td>
                    {r.room_number}
                    <div className="muted">{r.category_name}</div>
                  </td>
                  <td>
                    {r.check_in_date} → {r.check_out_date}
                  </td>
                  <td>{r.guests}</td>
                  <td>{peso.format(r.total_amount)}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                    {r.status === 'rejected' && r.cancellation_reason && (
                      <div className="muted">{r.cancellation_reason}</div>
                    )}
                  </td>
                  <td className="text-right">
                    {r.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-primary"
                          disabled={busyId === r.id}
                          onClick={() => confirm(r)}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn btn-danger-ghost"
                          disabled={busyId === r.id}
                          onClick={() => reject(r)}
                        >
                          Reject
                        </button>
                      </>
                    )}
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
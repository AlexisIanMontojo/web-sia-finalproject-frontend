import { useState } from 'react';
import Swal from 'sweetalert2';
import { reservationsApi } from './customerService';
import RequestChangeModal from './RequestChangeModal';
import RatingsPanel from './RatingsPanel';
import { useCachedFetch, invalidate } from '../../lib/cache';
import '../../layouts/Customer.css';
import ReservationServices from './ReservationServices';
import ReservationPayment from './ReservationPayment';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const STATUS_LABEL = {
  pending: 'Pending confirmation',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  checked_out: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

const fetchReservations = async () => {
  const { data } = await reservationsApi.list();
  return data.data;
};

export default function MyReservationsPage() {
  const reservations = useCachedFetch('customer:reservations', fetchReservations);
  const rows = reservations.data ?? [];

  const [tab, setTab] = useState('current');
  const [changing, setChanging] = useState(null);

  const visible = rows.filter((r) => (tab === 'current' ? r.is_current : !r.is_current));

  function refresh() {
    invalidate('customer:reservations');
    reservations.refresh();
  }

  async function cancel(row) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Cancel this reservation?',
      text: `${row.reservation_code} will be cancelled.`,
      showCancelButton: true,
      confirmButtonText: 'Yes, cancel it',
      confirmButtonColor: '#b91c1c',
    });
    if (!result.isConfirmed) return;

    try {
      await reservationsApi.cancel(row.id, 'Cancelled by customer');
      await Swal.fire({
        icon: 'success',
        title: 'Reservation cancelled',
        timer: 1500,
        showConfirmButton: false,
      });
      refresh();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Cannot cancel',
        text: err.response?.data?.message || 'Try again.',
      });
    }
  }

  return (
    <section>
      <h1>My Reservations</h1>

      <div className="tabs">
        <button className={`tab ${tab === 'current' ? 'active' : ''}`} onClick={() => setTab('current')}>
          Current
        </button>
        <button className={`tab ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>
          Previous
        </button>
      </div>

      {reservations.error && (
        <div className="error-box">
          {reservations.error.response?.data?.message || 'Could not load reservations.'}
        </div>
      )}

      {reservations.loading && !reservations.data && <p>Loading…</p>}

      {reservations.data && visible.length === 0 && (
        <div className="panel">No reservations here yet.</div>
      )}

      {visible.map((r) => (
        <div className="panel" key={r.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <strong>{r.reservation_code}</strong>
            <span className={`status status-${r.status}`}>
              {STATUS_LABEL[r.status] || r.status}
            </span>
          </div>

          <p>Room {r.room_number} · {r.category_name}</p>
          <p className="muted">
            {r.check_in_date} to {r.check_out_date} · {r.guests} guest(s)
          </p>
          <p><strong>{peso.format(r.total_amount)}</strong></p>

          {r.status === 'cancelled' && r.cancellation_reason && (
            <p className="muted">Reason: {r.cancellation_reason}</p>
          )}

          <div className="map-actions">
            {r.cancellable && (
              <button className="btn-soft" onClick={() => setChanging(r)}>
                Request change
              </button>
            )}
            {r.cancellable && (
              <button className="btn-outline" onClick={() => cancel(r)}>
                Cancel reservation
              </button>
            )}
          </div>
            {['pending', 'confirmed'].includes(r.status) && <ReservationPayment reservation={r} />}
            {r.is_current && <ReservationServices reservation={r} />}
        </div>
      ))}

      <RatingsPanel />

      {changing && (
        <RequestChangeModal
          reservation={changing}
          onClose={() => setChanging(null)}
          onSaved={() => {
            setChanging(null);
            refresh();
          }}
        />
      )}
    </section>
  );
}
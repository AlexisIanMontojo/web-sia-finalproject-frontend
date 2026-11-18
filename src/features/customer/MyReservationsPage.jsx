import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { reservationsApi } from './customerService';
import RequestChangeModal from './RequestChangeModal';
import RatingsPanel from './RatingsPanel';
import ReservationServices from './ReservationServices';
import ReservationPayment from './ReservationPayment';
import { useAuth } from '../auth/AuthContext';
import { useCachedFetch, invalidate } from '../../lib/cache';
import '../../layouts/Customer.css';

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
  return Array.isArray(data?.data) ? data.data : [];
};

export default function MyReservationsPage() {
  const { user } = useAuth();
  const reservations = useCachedFetch('customer:reservations', fetchReservations);
  const [searchParams] = useSearchParams();
  const rows = useMemo(() => reservations.data ?? [], [reservations.data]);
  const legacyPaidValue = searchParams.get('paid');
  const paymentResult = searchParams.get('result') || (
    legacyPaidValue ? (legacyPaidValue === 'failed' ? 'failed' : 'success') : ''
  );
  const returnedReservationId = searchParams.get('reservation_id');
  const returnedExternalId = searchParams.get('external_id') || (
    legacyPaidValue && legacyPaidValue !== 'failed' ? legacyPaidValue : ''
  );

  const [tab, setTab] = useState('current');
  const [changing, setChanging] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const refreshReservations = reservations.refresh;

  const visible = rows.filter((r) => (tab === 'current' ? r.is_current : !r.is_current));
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const upcomingCount = rows.filter(
    (r) => ['pending', 'confirmed'].includes(r.status) && r.check_in_date >= today
  ).length;

  const refresh = useCallback(() => {
    invalidate('customer:reservations');
    refreshReservations();
  }, [refreshReservations]);

  useEffect(() => {
    const refreshAfterServiceChange = (event) => {
      if (rows.some((reservation) => (
        Number(reservation.id) === Number(event.detail?.reservationId)
      ))) {
        refresh();
      }
    };

    window.addEventListener('reservation-services:changed', refreshAfterServiceChange);
    return () => {
      window.removeEventListener('reservation-services:changed', refreshAfterServiceChange);
    };
  }, [refresh, rows]);

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

    setCancellingId(row.id);
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
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section>
      <div className="guest-welcome">
        <div>
          <p className="guest-eyebrow">YOUR STAY, CONSIDERED</p>
          <h1>Welcome back, {user?.username || 'Guest'}</h1>
          <p>Manage your reservations, payments, and services in one place.</p>
        </div>
        <div className="guest-welcome-actions">
          {reservations.data && (
            <div className="guest-upcoming">
              <strong>{upcomingCount}</strong>
              <span>upcoming {upcomingCount === 1 ? 'stay' : 'stays'}</span>
            </div>
          )}
          <Link to="/rooms" className="btn-main">Explore rooms</Link>
        </div>
      </div>

      <div className="page-intro">
        <h1>My Reservations</h1>
        <p className="muted">Your booking history and current hotel stays.</p>
      </div>

      {paymentResult === 'success' && (
        <div className="panel" role="status">
          We received your payment return. Check the payment status below; it is only marked paid
          after verification with Xendit.
        </div>
      )}
      {paymentResult === 'failed' && (
        <div className="error-box" role="status">
          The payment was not completed. You can try again from the reservation below.
        </div>
      )}

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
          <div className="thread-head">
            <strong>{r.reservation_code}</strong>
            <span className={`status status-${r.status}`}>
              {STATUS_LABEL[r.status] || r.status}
            </span>
          </div>

          <p>Room {r.room_number} · {r.category_name}</p>
          <p className="muted">
            {r.check_in_date} to {r.check_out_date} · {r.guests} guest(s)
          </p>
          <p><strong>Stay total: {peso.format(r.total_amount)}</strong></p>

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
              <button
                className="btn-outline"
                disabled={cancellingId === r.id}
                onClick={() => cancel(r)}
              >
                {cancellingId === r.id ? 'Cancelling…' : 'Cancel reservation'}
              </button>
            )}
          </div>

          {(
            ['pending', 'confirmed', 'checked_in', 'checked_out'].includes(r.status) ||
            (returnedReservationId && String(r.id) === returnedReservationId)
          ) && (
            <ReservationPayment
              reservation={r}
              verifyExternalId={
                paymentResult === 'success'
                && (!returnedReservationId || String(r.id) === returnedReservationId)
                  ? returnedExternalId
                  : ''
              }
            />
          )}

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
import { useState } from 'react';
import Swal from 'sweetalert2';
import { checkinApi } from '../adminService';
import { toast, showError } from '../../../lib/alerts';
import { useCachedFetch, invalidate } from '../../../lib/cache';
import '../../../layouts/Admin.css';

const fetchCheckins = async () => {
  const { data } = await checkinApi.list();
  return data;
};

const STATUS_BADGE = {
  confirmed: 'badge-amber',
  checked_in: 'badge-red',
};

const STATUS_LABEL = {
  confirmed: 'Confirmed (arriving)',
  checked_in: 'Checked in',
};

export default function CheckinOutPage() {
  const state = useCachedFetch('admin:checkinout', fetchCheckins);
  const rows = state.data?.data ?? [];
  const today = state.data?.today;

  const [busyId, setBusyId] = useState(null);

  function refresh() {
    invalidate('admin:checkinout');
    invalidate('admin:rooms');
    invalidate('admin:availability');
    state.refresh();
  }

  async function act(row, action) {
    const isIn = action === 'in';
    const early = !isIn && row.early_if_checked_out;

    const result = await Swal.fire({
      icon: early ? 'warning' : 'question',
      title: isIn
        ? `Check in ${row.reservation_code}?`
        : early
          ? `Check out ${row.reservation_code} early?`
          : `Check out ${row.reservation_code}?`,
      text: isIn
        ? `Room ${row.room_number} will be occupied.`
        : early
          ? `The planned check-out is ${row.check_out_date}. Checking out now releases the room from today.`
          : `Room ${row.room_number} will be released, and the guest can rate the stay.`,
      input: early ? 'text' : undefined,
      inputLabel: early ? 'Reason for early departure (required)' : undefined,
      inputPlaceholder: early ? 'e.g. Guest left early for an emergency' : undefined,
      inputValidator: early
        ? (value) => (value.trim().length < 3 ? 'Please enter a reason.' : null)
        : undefined,
      showCancelButton: true,
      confirmButtonText: isIn ? 'Check in' : early ? 'Check out early' : 'Check out',
      confirmButtonColor: early ? '#b45309' : '#174d38',
    });
    if (!result.isConfirmed) return;

    setBusyId(row.id);
    try {
      if (isIn) {
        await checkinApi.checkIn(row.id, result.value || '');
      } else {
        await checkinApi.checkOut(row.id, {
          notes: early ? '' : result.value || '',
          early_reason: early ? result.value.trim() : '',
        });
      }
      toast('success', isIn ? 'Guest checked in' : 'Guest checked out');
      refresh();
    } catch (err) {
      showError(
        isIn ? 'Cannot check in' : 'Cannot check out',
        err.response?.data?.message || 'Try again.'
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Check-in / Check-out</h1>
          <p className="admin-page-subtitle">
            Arrivals due today or earlier, and guests currently in the hotel.
            {today ? ` Today is ${today}.` : ''}
          </p>
        </div>
      </div>

      <div className="table-card">
        {state.loading && !state.data ? (
          <div className="table-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="table-empty">No arrivals or guests in the hotel right now.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Guest</th>
                <th>Room</th>
                <th>Stay</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.reservation_code}</strong></td>
                  <td>{r.guest_name}</td>
                  <td>
                    {r.room_number}
                    <div className="muted">{r.category_name}</div>
                  </td>
                  <td>{r.check_in_date} → {r.check_out_date}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td className="text-right">
                    {r.status === 'confirmed' && (
                      <button
                        className="btn btn-primary"
                        disabled={busyId === r.id || r.check_in_date > today}
                        onClick={() => act(r, 'in')}
                      >
                        Check in
                      </button>
                    )}
                    {r.status === 'checked_in' && (
                      <button
                        className="btn btn-ghost"
                        disabled={busyId === r.id || today < r.check_in_date}
                        onClick={() => act(r, 'out')}
                      >
                        Check out
                      </button>
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
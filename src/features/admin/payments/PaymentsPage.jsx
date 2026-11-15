import { useEffect, useMemo, useState } from 'react';
import { paymentsAdminApi } from '../adminService';
import { showError, toast } from '../../../lib/alerts';
import { useCachedFetch, invalidate } from '../../../lib/cache';
import { clearApiCache } from '../../../services/api';
import '../../../layouts/Admin.css';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const STATUS_BADGE = {
  pending: 'badge-amber',
  paid: 'badge-green',
  expired: 'badge-gray',
  failed: 'badge-red',
};

const PAYMENT_LABEL = {
  downpayment: 'Downpayment',
  full: 'Full payment',
  balance: 'Balance payment',
  service: 'Extra services',
};

const fetchPayments = async () => {
  const { data } = await paymentsAdminApi.list();
  return Array.isArray(data?.data) ? data.data : [];
};

export default function PaymentsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const paymentState = useCachedFetch('admin:payments', fetchPayments);
  const rows = useMemo(() => paymentState.data || [], [paymentState.data]);
  const loading = paymentState.loading;

  useEffect(() => {
    if (paymentState.error) {
      showError('Could not load payments', paymentState.error.response?.data?.message || 'Try again.');
    }
  }, [paymentState.error]);

  function load() {
    invalidate('admin:payments');
    clearApiCache();
    setRefreshing(true);
    paymentState.refresh().finally(() => setRefreshing(false));
  }

  async function markCashPaid(row) {
    setBusyId(row.id);
    try {
      await paymentsAdminApi.markCashPaid(row.id);
      toast('success', 'Cash payment recorded as paid');
      load();
    } catch (err) {
      showError('Could not record cash payment', err.response?.data?.message || 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (status && row.status !== status) return false;
      if (!term) return true;
      return [
        row.reservation_code,
        row.guest_name,
        row.guest_email,
        row.external_id,
        row.room_number,
      ].some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [rows, search, status]);

  const paidTotal = rows
    .filter((row) => row.status === 'paid')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const pendingTotal = rows
    .filter((row) => row.status === 'pending')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Payments &amp; Billing</h1>
          <p className="admin-page-subtitle">
            Review Xendit and cash payments, and confirm cash received by the hotel.
          </p>
        </div>
        <button className="btn btn-primary" onClick={load} disabled={loading || refreshing}>
          {loading || refreshing ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div>
            <p className="stat-label">Recorded payments</p>
            <p className="stat-value">{rows.length}</p>
          </div>
        </div>
        <div className="stat-card tone-teal">
          <div>
            <p className="stat-label">Paid total</p>
            <p className="stat-value">{peso.format(paidTotal)}</p>
          </div>
        </div>
        <div className="stat-card tone-amber">
          <div>
            <p className="stat-label">Pending</p>
            <p className="stat-value">{peso.format(pendingTotal)}</p>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <select
          className="input"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by payment status"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="expired">Expired</option>
          <option value="failed">Failed</option>
        </select>
        <input
          className="input search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search guest, reservation, room…"
          aria-label="Search payments"
        />
      </div>

      <div className="table-card">
        {loading && !paymentState.data ? (
          <div className="table-empty">Loading payments…</div>
        ) : filteredRows.length === 0 ? (
          <div className="table-empty">No payments match this filter.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Payment</th>
                <th>Guest</th>
                <th>Reservation</th>
                <th>Room / stay</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Paid at</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>
                      {PAYMENT_LABEL[row.kind] || row.kind}
                    </strong>
                    <div className="muted">{row.provider} · {row.external_id}</div>
                  </td>
                  <td>
                    {row.guest_name}
                    <div className="muted">{row.guest_email}</div>
                  </td>
                  <td>
                    <strong>{row.reservation_code}</strong>
                    <div className="muted">
                      {String(row.reservation_status || '').replace('_', ' ')}
                    </div>
                  </td>
                  <td>
                    {row.room_number} · {row.category_name}
                    <div className="muted">{row.check_in_date} → {row.check_out_date}</div>
                  </td>
                  <td>{peso.format(Number(row.amount || 0))}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[row.status] || 'badge-gray'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>{row.paid_at || '—'}</td>
                  <td className="text-right">
                    {row.provider === 'cash' && row.status === 'pending' && (
                      <button
                        className="btn btn-primary"
                        disabled={busyId === row.id}
                        onClick={() => markCashPaid(row)}
                      >
                        {busyId === row.id ? 'Saving…' : 'Mark cash received'}
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

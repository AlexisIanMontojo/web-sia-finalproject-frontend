import { useCallback, useState } from 'react';
import { reportsApi } from '../adminService';
import ChartCard from '../components/ChartCard';
import { useCachedFetch, invalidate } from '../../../lib/cache';
import { clearApiCache } from '../../../services/api';
import '../../../layouts/Admin.css';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

function localDateString(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function initialRange() {
  const today = new Date();
  return {
    from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
    to: localDateString(today),
  };
}

function csvCell(value) {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadCsv(data, range) {
  const rows = [
    ['Hotel reservation report', `${range.from} to ${range.to}`],
    [],
    ['Summary', 'Value'],
    ['Reservations created', data.summary.reservation_count],
    ['Paid revenue', data.summary.paid_revenue],
    ['Service revenue', data.summary.service_revenue],
    ['Occupancy', `${data.summary.occupancy_percent}%`],
    ['Occupied room nights', data.summary.occupied_room_nights],
    [],
    ['Monthly trend', 'Reservations', 'Paid revenue'],
    ...data.monthly.labels.map((month, index) => [
      month,
      data.monthly.reservations[index],
      data.monthly.revenue[index],
    ]),
    [],
    ['Top services', 'Requests', 'Paid revenue'],
    ...data.top_services.map((service) => [
      service.name,
      service.requests,
      service.amount,
    ]),
    [],
    ['Reservation status', 'Count'],
    ...data.reservation_statuses.map((item) => [item.status, item.total]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `hotel-report-${range.from}-to-${range.to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [draft, setDraft] = useState(initialRange);
  const [applied, setApplied] = useState(initialRange);
  const key = `admin:reports:${applied.from}:${applied.to}`;
  const fetchReport = useCallback(async () => {
    const { data } = await reportsApi.get(applied.from, applied.to);
    return data;
  }, [applied.from, applied.to]);
  const { data, loading, error, refresh } = useCachedFetch(key, fetchReport);

  function submit(event) {
    event.preventDefault();
    setApplied({ ...draft });
  }

  function reload() {
    invalidate(key);
    clearApiCache();
    refresh();
  }

  const summary = data?.summary;
  const statuses = data?.reservation_statuses || [];
  const monthly = data?.monthly || { labels: [], reservations: [], revenue: [] };
  const services = data?.top_services || [];

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Reports</h1>
          <p className="admin-page-subtitle">
            Reservation activity, occupancy, verified payments, and extra-service revenue.
          </p>
        </div>
        <div className="map-actions">
          {data && (
            <button className="btn btn-ghost" onClick={() => downloadCsv(data, applied)}>
              Export CSV
            </button>
          )}
          <button className="btn btn-ghost" onClick={reload} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <form className="toolbar" onSubmit={submit}>
        <label className="report-date-field">
          From
          <input
            className="input"
            type="date"
            value={draft.from}
            max={draft.to}
            onChange={(event) => setDraft((value) => ({ ...value, from: event.target.value }))}
            required
          />
        </label>
        <label className="report-date-field">
          To
          <input
            className="input"
            type="date"
            value={draft.to}
            min={draft.from}
            onChange={(event) => setDraft((value) => ({ ...value, to: event.target.value }))}
            required
          />
        </label>
        <button className="btn btn-primary" type="submit">Generate report</button>
      </form>

      {error && (
        <div className="error-box" role="alert">
          {error.response?.data?.message || 'Could not load reports. Please try again.'}
        </div>
      )}
      {loading && !data && <div className="admin-loading">Loading reports…</div>}

      {summary && (
        <>
          <div className="stat-grid">
            <div className="stat-card tone-gray">
              <div>
                <p className="stat-label">Reservations created</p>
                <p className="stat-value">{summary.reservation_count}</p>
              </div>
            </div>
            <div className="stat-card tone-teal">
              <div>
                <p className="stat-label">Verified paid revenue</p>
                <p className="stat-value">{peso.format(summary.paid_revenue)}</p>
              </div>
            </div>
            <div className="stat-card tone-blue">
              <div>
                <p className="stat-label">Service revenue</p>
                <p className="stat-value">{peso.format(summary.service_revenue)}</p>
              </div>
            </div>
            <div className="stat-card tone-amber">
              <div>
                <p className="stat-label">Occupancy</p>
                <p className="stat-value">{summary.occupancy_percent}%</p>
                <p className="stat-note">{summary.occupied_room_nights} occupied room nights</p>
              </div>
            </div>
          </div>

          <div className="chart-grid">
            <ChartCard
              title="Reservations by Month"
              labels={monthly.labels}
              values={monthly.reservations}
            />
            <ChartCard
              title="Paid Revenue by Month"
              labels={monthly.labels}
              values={monthly.revenue}
            />
          </div>

          <div className="table-card">
            <h2 className="chart-title">Reservation Status</h2>
            {statuses.length === 0 ? (
              <div className="table-empty">No reservations in this date range.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Status</th><th className="text-right">Reservations</th></tr>
                </thead>
                <tbody>
                  {statuses.map((item) => (
                    <tr key={item.status}>
                      <td>{item.status.replace(/_/g, ' ')}</td>
                      <td className="text-right">{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="table-card">
            <h2 className="chart-title">Top Paid Extra Services</h2>
            {services.length === 0 ? (
              <div className="table-empty">No paid extra services in this date range.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th className="text-right">Requests</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.name}>
                      <td>{service.name}</td>
                      <td className="text-right">{service.requests}</td>
                      <td className="text-right">{peso.format(service.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  );
}

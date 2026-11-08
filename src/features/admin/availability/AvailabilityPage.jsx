import { useEffect, useMemo, useState } from 'react';
import { availabilityApi, roomBlocksApi } from '../adminService';
import { toast, showError, confirmDelete } from '../../../lib/alerts';
import '../../../layouts/Admin.css';

function localDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

// Each night from check-in up to, but not including, check-out.
function nightsBetween(from, to) {
  const days = [];
  const d = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (d < end) {
    days.push(
      [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-')
    );
    d.setDate(d.getDate() + 1);
  }
  return days;
}

const EMPTY_BLOCK = {
  room_id: '',
  start_date: '',
  end_date: '',
  block_type: 'out_of_order',
  reason: '',
};

const TYPE_LABEL = {
  out_of_order: 'Out of order',
  occupied: 'Occupied (manual)',
};

export default function AvailabilityPage() {
  const [range, setRange] = useState({ from: localDate(0), to: localDate(7) });
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [today, setToday] = useState(localDate(0));
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const [blockForm, setBlockForm] = useState({
    ...EMPTY_BLOCK,
    start_date: localDate(0),
    end_date: localDate(1),
  });
  const [blockErrors, setBlockErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  async function load(r = range) {
    setLoading(true);
    try {
      const { data: res } = await availabilityApi.list(r.from, r.to);
      setData(res.data);
      setSummary(res.summary);
      setToday(res.today);
    } catch (err) {
      showError(
        'Could not load availability',
        err.response?.data?.errors?.join(' ') || err.response?.data?.message || 'Try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const days = useMemo(() => nightsBetween(range.from, range.to), [range]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.filter((r) => {
      const hasOutOfOrder = r.blocks.some((b) => b.block_type === 'out_of_order');
      if (filter === 'free') return r.is_free;
      if (filter === 'booked') return !r.blocked && r.bookings.length > 0;
      if (filter === 'occupied') return r.occupied_now;
      if (filter === 'blocked') return r.blocked || hasOutOfOrder;
      return true;
    });
  }, [data, filter]);

  const allBlocks = useMemo(() => {
    if (!data) return [];
    return data
      .flatMap((room) =>
        room.blocks.map((b) => ({
          ...b,
          room_id: room.id,
          room_number: room.room_number,
        }))
      )
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [data]);

  function bookingOn(room, day) {
    return room.bookings.find((b) => b.check_in_date <= day && b.check_out_date > day);
  }

  function blockOn(room, day) {
    return room.blocks.find((b) => b.start_date <= day && b.end_date > day);
  }

  function handleRangeChange(e) {
    setRange((r) => ({ ...r, [e.target.name]: e.target.value }));
  }

  function handleBlockChange(e) {
    setBlockForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submitBlock(e) {
    e.preventDefault();
    setSaving(true);
    setBlockErrors([]);

    try {
      await roomBlocksApi.create({ ...blockForm, room_id: Number(blockForm.room_id) });
      toast('success', blockForm.block_type === 'occupied' ? 'Room marked occupied' : 'Dates blocked');
      setBlockForm({
        ...EMPTY_BLOCK,
        start_date: blockForm.start_date,
        end_date: blockForm.end_date,
        block_type: blockForm.block_type,
      });
      load(range);
    } catch (err) {
      setBlockErrors(
        err.response?.data?.errors || [err.response?.data?.message || 'Could not save these dates.']
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(block) {
    const ok = await confirmDelete(`${block.room_number}: ${block.start_date} to ${block.end_date}`);
    if (!ok) return;

    try {
      await roomBlocksApi.remove(block.id);
      toast('success', 'Removed');
      load(range);
    } catch (err) {
      showError('Could not remove', err.response?.data?.message || 'Try again.');
    }
  }

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Room Availability</h1>
          <p className="admin-page-subtitle">
            Bookings come from reservations. Use the form below to mark rooms out of order or occupied for specific nights.
          </p>
        </div>
      </div>

      <div className="toolbar">
        <label className="field" style={{ margin: 0 }}>
          <span>From</span>
          <input className="input" type="date" name="from" value={range.from} onChange={handleRangeChange} />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span>To (check-out)</span>
          <input className="input" type="date" name="to" value={range.to} onChange={handleRangeChange} />
        </label>
        <button className="btn btn-primary" onClick={() => load(range)} disabled={loading}>
          {loading ? 'Loading…' : 'Show'}
        </button>
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All rooms</option>
          <option value="free">Free only</option>
          <option value="booked">Booked</option>
          <option value="occupied">Occupied now</option>
          <option value="blocked">Out of order</option>
        </select>
      </div>

      {summary && (
        <div className="stat-grid">
          <div className="stat-card tone-gray">
            <div>
              <p className="stat-label">Total rooms</p>
              <p className="stat-value">{summary.total}</p>
            </div>
          </div>
          <div className="stat-card tone-teal">
            <div>
              <p className="stat-label">Free</p>
              <p className="stat-value">{summary.free}</p>
            </div>
          </div>
          <div className="stat-card tone-amber">
            <div>
              <p className="stat-label">Booked</p>
              <p className="stat-value">{summary.booked}</p>
            </div>
          </div>
          <div className="stat-card tone-red">
            <div>
              <p className="stat-label">Occupied now</p>
              <p className="stat-value">{summary.occupied_now}</p>
            </div>
          </div>
          <div className="stat-card tone-purple">
            <div>
              <p className="stat-label">Rooms with blocks</p>
              <p className="stat-value">{summary.with_blocks}</p>
            </div>
          </div>
          <div className="stat-card tone-gray">
            <div>
              <p className="stat-label">Out of order</p>
              <p className="stat-value">{summary.out_of_order}</p>
            </div>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>Update availability</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          <strong>Occupied</strong> records a walk-in or manual stay. <strong>Out of order</strong> takes a room out of sale for repairs or closures. The end date is the first night the room is open again.
        </p>

        {blockErrors.length > 0 && (
          <div className="auth-message auth-error" role="alert">
            {blockErrors.map((m) => (
              <div key={m}>{m}</div>
            ))}
          </div>
        )}

        <form onSubmit={submitBlock}>
          <div className="form-row">
            <label className="field">
              <span>Room</span>
              <select
                name="room_id"
                className="input"
                value={blockForm.room_id}
                onChange={handleBlockChange}
                required
              >
                <option value="">Select…</option>
                {(data || []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.room_number} · {r.category_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Type</span>
              <select
                name="block_type"
                className="input"
                value={blockForm.block_type}
                onChange={handleBlockChange}
              >
                <option value="occupied">Occupied (walk-in or manual stay)</option>
                <option value="out_of_order">Out of order (repair or closure)</option>
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              <span>From</span>
              <input
                name="start_date"
                type="date"
                className="input"
                value={blockForm.start_date}
                onChange={handleBlockChange}
                required
              />
            </label>
            <label className="field">
              <span>Until (check-out)</span>
              <input
                name="end_date"
                type="date"
                className="input"
                value={blockForm.end_date}
                onChange={handleBlockChange}
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Note (optional)</span>
            <input
              name="reason"
              className="input"
              placeholder="Walk-in guest, repainting, plumbing…"
              value={blockForm.reason}
              onChange={handleBlockChange}
            />
          </label>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>

        {allBlocks.length > 0 && (
          <div className="table-card" style={{ marginTop: 16 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>Until</th>
                  <th>Note</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {allBlocks.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.room_number}</strong>
                    </td>
                    <td>
                      <span className={`badge ${b.block_type === 'occupied' ? 'badge-red' : 'badge-amber'}`}>
                        {TYPE_LABEL[b.block_type] || b.block_type}
                      </span>
                    </td>
                    <td>{b.start_date}</td>
                    <td>{b.end_date}</td>
                    <td>{b.reason || <span className="muted">—</span>}</td>
                    <td className="text-right">
                      <button className="btn btn-danger-ghost" onClick={() => removeBlock(b)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="table-card" style={{ overflowX: 'auto' }}>
        {!data ? (
          <div className="table-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="table-empty">No rooms match this filter.</div>
        ) : (
          <table className="admin-table avail-table">
            <thead>
              <tr>
                <th className="sticky-col">Room</th>
                {days.map((d) => (
                  <th key={d} className={`day-col ${d === today ? 'today-col' : ''}`}>
                    {new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((room) => (
                <tr key={room.id}>
                  <td className="sticky-col">
                    <strong>{room.room_number}</strong>
                    <div className="muted">{room.category_name}</div>
                  </td>

                  {days.map((day) => {
                    // 1. Room status (maintenance, out of service, inactive) covers every night.
                    if (room.blocked) {
                      return <td key={day} className="cell cell-blocked" title="Out of order" />;
                    }

                    // 2. Reservation: checked in = occupied, otherwise booked.
                    const b = bookingOn(room, day);
                    if (b) {
                      const kind = b.status === 'checked_in' ? 'occupied' : 'booked';
                      return (
                        <td
                          key={day}
                          className={`cell cell-${kind}`}
                          title={`${b.reservation_code} (${b.status})`}
                        />
                      );
                    }

                    // 3. Admin block for specific nights.
                    const blk = blockOn(room, day);
                    if (blk) {
                      if (blk.block_type === 'occupied') {
                        return (
                          <td
                            key={day}
                            className="cell cell-occupied"
                            title={blk.reason ? `Occupied: ${blk.reason}` : 'Occupied (manual)'}
                          />
                        );
                      }
                      return (
                        <td
                          key={day}
                          className="cell cell-blocked"
                          title={blk.reason ? `Out of order: ${blk.reason}` : 'Out of order'}
                        />
                      );
                    }

                    // 4. Free.
                    return <td key={day} className="cell cell-free" title="Free" />;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="legend">
        <span><i className="swatch cell-free" /> Free</span>
        <span><i className="swatch cell-booked" /> Booked (pending or confirmed)</span>
        <span><i className="swatch cell-occupied" /> Occupied (checked in or manual)</span>
        <span><i className="swatch cell-blocked" /> Out of order</span>
      </div>
    </section>
  );
}
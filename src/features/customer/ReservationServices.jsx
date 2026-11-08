import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { servicesApi } from './customerService';
import { toast, showError } from '../../lib/alerts';
import '../../layouts/Customer.css';
import '../../layouts/Messages.css';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const CATEGORY_LABEL = {
  laundry: 'Laundry',
  food: 'Food',
  spa: 'Spa',
  meeting: 'Meeting room',
  other: 'Other',
};

const STATUS_LABEL = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_TAG = {
  requested: 'tag-unread',
  confirmed: 'tag-ok',
  completed: '',
  cancelled: 'tag-warn',
};

const LIMITS = {
  per_hour: { min: 1, max: 8, step: '1' },
  per_kilo: { min: 0.5, max: 100, step: '0.5' },
  default: { min: 1, max: 50, step: '1' },
};

function limitsFor(unit) {
  return LIMITS[unit] || LIMITS.default;
}

// Earliest selectable time: the next full hour, in the format datetime-local expects.
function earliestStart() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "2026-11-06 14:00:00" -> "Nov 6, 2:00 PM"
function formatWhen(value) {
  if (!value) return '';
  const d = new Date(value.replace(' ', 'T'));
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatQuantity(q, unit) {
  return unit === 'per_kilo' ? `${Number(q).toFixed(2)} kg` : `× ${q}`;
}

const EMPTY_FORM = { quantity: '', scheduled_at: '', notes: '' };

export default function ReservationServices({ reservation }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [catalog, setCatalog] = useState([]);
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [stayOpen, setStayOpen] = useState(false);

  const [pickedId, setPickedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [cat, mine] = await Promise.all([
        servicesApi.catalog(),
        servicesApi.forReservation(reservation.id),
      ]);
      setCatalog(cat.data.data);
      setRequests(mine.data.data);
      setTotal(mine.data.total);
      setStayOpen(mine.data.open);
      setLoaded(true);
    } catch (err) {
      showError('Could not load services', err.response?.data?.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  // Load once, the first time the panel opens.
  useEffect(() => {
    if (open && !loaded) load();
  }, [open, loaded]);

  const service = useMemo(
    () => catalog.find((s) => s.id === pickedId) || null,
    [catalog, pickedId]
  );

  const limits = service ? limitsFor(service.unit) : LIMITS.default;

  // Entered quantity, clamped to the allowed range for this unit.
  const quantity = useMemo(() => {
    if (!service) return 0;
    if (service.unit === 'per_stay') return 1;

    const n = Number(form.quantity);
    if (!form.quantity || Number.isNaN(n)) return limits.min;

    return Math.min(Math.max(n, limits.min), limits.max);
  }, [service, form.quantity, limits]);

  const lineTotal = service ? service.price * quantity : 0;

  const canSubmit =
    !!service &&
    !saving &&
    (service.unit === 'per_stay' || (form.quantity !== '' && Number(form.quantity) >= limits.min)) &&
    (!service.requires_schedule || form.scheduled_at !== '');

  function pick(s) {
    setPickedId(s.id);
    setForm(EMPTY_FORM);
    setErrors([]);
  }

  function clearPick() {
    setPickedId(null);
    setForm(EMPTY_FORM);
    setErrors([]);
  }

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setErrors([]);
    try {
      await servicesApi.add(reservation.id, {
        service_id: service.id,
        quantity,
        scheduled_at: service.requires_schedule ? form.scheduled_at : '',
        notes: form.notes.trim(),
      });
      toast('success', 'Request sent. The hotel will confirm it.');
      clearPick();
      await load();
    } catch (err) {
      setErrors(
        err.response?.data?.errors || [err.response?.data?.message || 'Could not add this service.']
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancel(row) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Cancel this request?',
      text: `${row.name} will be removed from your bill.`,
      showCancelButton: true,
      confirmButtonText: 'Yes, cancel it',
      confirmButtonColor: '#b91c1c',
    });
    if (!result.isConfirmed) return;

    setBusyId(row.id);
    try {
      await servicesApi.cancel(row.id);
      toast('success', 'Request cancelled');
      await load();
    } catch (err) {
      showError('Cannot cancel', err.response?.data?.message || 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="services-box">
      <button
        className="btn-soft"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Hide extra services' : 'Extra services'}
      </button>

      {open && (
        <div className="stack">
          {loading && !loaded && <p className="muted">Loading services…</p>}

          {loaded && requests.length > 0 && (
            <div className="service-list">
              <h4>Your requests · total {peso.format(total)}</h4>
              {requests.map((r) => (
                <div className="service-row" key={r.id}>
                  <span>
                    <strong>{r.name}</strong>
                    {' '}
                    {formatQuantity(r.quantity, r.unit)}
                    {r.scheduled_at && (
                      <div className="muted">
                        {formatWhen(r.scheduled_at)} to {formatWhen(r.ends_at)}
                      </div>
                    )}
                  </span>
                  <span className={`tag ${STATUS_TAG[r.status] || ''}`}>
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                  <span className={`tag ${r.billing_status === 'paid' ? 'tag-ok' : ''}`}>
                    {r.billing_status === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                  <span>{peso.format(r.total_amount)}</span>
                  {r.status === 'requested' ? (
                    <button
                      className="btn-outline"
                      disabled={busyId === r.id}
                      onClick={() => cancel(r)}
                    >
                      {busyId === r.id ? 'Cancelling…' : 'Cancel'}
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
          )}

          {loaded && !stayOpen && (
            <div className="error-box">
              This stay is no longer open for extra services.
            </div>
          )}

          {loaded && stayOpen && catalog.length === 0 && (
            <p className="muted">No extra services are offered right now.</p>
          )}

          {loaded && stayOpen && catalog.length > 0 && (
            <>
              <h4>Add a service</h4>
              <div className="service-grid">
                {catalog.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={pickedId === s.id}
                    className={`service-card ${pickedId === s.id ? 'selected' : ''}`}
                    onClick={() => pick(s)}
                  >
                    <span className="tag">{CATEGORY_LABEL[s.category] || s.category}</span>
                    <strong>{s.name}</strong>
                    {s.description && <small className="muted">{s.description}</small>}
                    <span className="price-sub">
                      {peso.format(s.price)} / {s.unit_label.toLowerCase()}
                    </span>
                  </button>
                ))}
              </div>

              {service && (
                <form className="panel stack" onSubmit={submit}>
                  <div className="thread-head">
                    <h4>{service.name}</h4>
                    <button type="button" className="btn-soft" onClick={clearPick}>
                      Choose another
                    </button>
                  </div>

                  {errors.length > 0 && (
                    <div className="error-box">
                      {errors.map((m) => (
                        <div key={m}>{m}</div>
                      ))}
                    </div>
                  )}

                  {service.unit !== 'per_stay' && (
                    <label className="field-label">
                      {service.unit_label}
                      <input
                        className="input"
                        type="number"
                        name="quantity"
                        min={limits.min}
                        max={limits.max}
                        step={limits.step}
                        value={form.quantity}
                        onChange={onChange}
                        required
                      />
                      {service.unit === 'per_kilo' && (
                        <small className="muted">
                          Weigh the laundry at the front desk. Minimum {limits.min} kg, in steps of 0.5 kg.
                        </small>
                      )}
                    </label>
                  )}

                  {service.requires_schedule && (
                    <label className="field-label">
                      Start date and time
                      <input
                        className="input"
                        type="datetime-local"
                        name="scheduled_at"
                        min={earliestStart()}
                        value={form.scheduled_at}
                        onChange={onChange}
                        required
                      />
                      <small className="muted">
                        Must fall within your stay, and at least one hour from now.
                      </small>
                    </label>
                  )}

                  <label className="field-label">
                    Notes (optional)
                    <textarea
                      className="input"
                      name="notes"
                      rows={2}
                      maxLength={500}
                      value={form.notes}
                      onChange={onChange}
                    />
                  </label>

                  <div className="quote-row quote-total">
                    <span>Estimated total</span>
                    <span>{peso.format(lineTotal)}</span>
                  </div>

                  <p className="muted">
                    The hotel confirms this request. The charge is then added to your bill.
                  </p>

                  <div>
                    <button className="btn-main" disabled={!canSubmit}>
                      {saving ? 'Sending…' : 'Request this service'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { changeRequestApi } from './customerService';
import { toast } from '../../lib/alerts';

export default function RequestChangeModal({ reservation, onClose, onSaved }) {
  const [form, setForm] = useState({
    check_in: reservation.check_in_date,
    check_out: reservation.check_out_date,
    guests: reservation.guests,
    reason: '',
  });
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      await changeRequestApi.create(reservation.id, {
        check_in: form.check_in,
        check_out: form.check_out,
        guests: Number(form.guests),
        reason: form.reason,
      });
      toast('success', 'Change request sent');
      onSaved();
    } catch (err) {
      setErrors(err.response?.data?.errors || [err.response?.data?.message || 'Request failed.']);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !saving && onClose()}>
      <form className="modal stack" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <h2>Request a change</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="muted">
          The hotel reviews every request. Your booking changes only after approval.
        </p>

        {errors.length > 0 && (
          <div className="error-box">{errors.map((m) => <div key={m}>{m}</div>)}</div>
        )}

        <label className="field-label">
          New check-in
          <input className="input" type="date" name="check_in" value={form.check_in} onChange={handleChange} required />
        </label>
        <label className="field-label">
          New check-out
          <input className="input" type="date" name="check_out" value={form.check_out} onChange={handleChange} required />
        </label>
        <label className="field-label">
          Guests
          <input className="input" type="number" min="1" name="guests" value={form.guests} onChange={handleChange} required />
        </label>
        <label className="field-label">
          Reason (optional)
          <textarea className="input" rows={3} name="reason" value={form.reason} onChange={handleChange} />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn-soft" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-main" disabled={saving}>
            {saving ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </form>
    </div>
  );
}
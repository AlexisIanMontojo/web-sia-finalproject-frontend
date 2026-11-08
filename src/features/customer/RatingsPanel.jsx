import { useEffect, useMemo, useState } from 'react';
import { reservationsApi, reviewApi } from './customerService';
import { toast, showError } from '../../lib/alerts';
import StarRating from '../../components/StarRating';
import '../../layouts/Customer.css';

export default function RatingsPanel() {
  const [stays, setStays] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [drafts, setDrafts] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [resv, mine] = await Promise.all([reservationsApi.list(), reviewApi.mine()]);
      setStays(resv.data.data);
      setReviews(mine.data.data);
      setReviewedIds(new Set(mine.data.reviewed_reservation_ids));
    } catch (err) {
      showError('Could not load your stays', err.response?.data?.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const eligible = useMemo(
    () => stays.filter((s) => s.status === 'checked_out' && !reviewedIds.has(s.id)),
    [stays, reviewedIds]
  );

  function draft(id) {
    return drafts[id] || { rating: 0, comment: '' };
  }

  function setDraft(id, patch) {
    setDrafts((d) => ({ ...d, [id]: { ...draft(id), ...patch } }));
  }

  async function submit(stay) {
    const d = draft(stay.id);
    setSavingId(stay.id);
    setErrors((e) => ({ ...e, [stay.id]: [] }));

    try {
      await reviewApi.create({
        reservation_id: stay.id,
        rating: d.rating,
        comment: d.comment,
      });
      toast('success', 'Thank you for your review');
      load();
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [stay.id]: err.response?.data?.errors || [
          err.response?.data?.message || 'Could not save your review.',
        ],
      }));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="panel stack">
      <h3>Rate your stays</h3>

      {loading && <p className="muted">Loading…</p>}

      {!loading && eligible.length === 0 && (
        <p className="muted">
          No stays are waiting for a review. You can rate a stay after it has been checked out.
        </p>
      )}

      {eligible.map((stay) => {
        const d = draft(stay.id);
        const busy = savingId === stay.id;

        return (
          <div className="review-card" key={stay.id}>
            <div className="review-meta">
              <strong>Room {stay.room_number} · {stay.category_name}</strong>
              <span>{stay.check_in_date} → {stay.check_out_date}</span>
            </div>

            <StarRating
              value={d.rating}
              onChange={(n) => setDraft(stay.id, { rating: n })}
              label="Your rating"
            />

            <textarea
              className="input"
              rows={3}
              maxLength={1000}
              placeholder="Tell other guests about your stay (optional)"
              value={d.comment}
              onChange={(e) => setDraft(stay.id, { comment: e.target.value })}
            />

            {(errors[stay.id] || []).map((m) => (
              <div className="error-box" key={m}>{m}</div>
            ))}

            <div>
              <button
                className="btn-main"
                disabled={busy || d.rating < 1}
                onClick={() => submit(stay)}
              >
                {busy ? 'Submitting…' : 'Submit review'}
              </button>
            </div>
          </div>
        );
      })}

      {reviews.length > 0 && (
        <>
          <h3>Your reviews</h3>
          {reviews.map((rv) => {
            const stay = stays.find((s) => s.id === rv.reservation_id);
            return (
              <div className="review-card" key={rv.id}>
                <div className="review-meta">
                  <strong>{stay ? `Room ${stay.room_number}` : 'Stay'}</strong>
                  <span>{rv.created_at?.slice(0, 10)}</span>
                </div>
                <StarRating value={rv.rating} size="sm" />
                {rv.comment && <p>{rv.comment}</p>}
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}
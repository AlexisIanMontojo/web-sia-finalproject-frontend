import { fetchTestimonials } from './customerService';
import { useCachedFetch } from '../../lib/cache';
import StarRating from '../../components/StarRating';
import '../../layouts/Customer.css';

export default function TestimonialsSection() {
  const { data: state } = useCachedFetch('public:testimonials', fetchTestimonials, {
    ttlMs: 5 * 60_000,
    persist: true,
    staleWhileRevalidateMs: 30 * 60_000,
  });

  if (!state || state.data.length === 0) {
    return null;
  }

  return (
    <div className="panel stack">
      <div className="review-summary">
        <h3>What guests say</h3>
        {state.summary?.average !== null && state.summary?.average !== undefined && (
          <>
            <span className="review-average">{state.summary.average.toFixed(1)}</span>
            <StarRating value={state.summary.average} size="sm" label="Average rating" />
            <span className="muted">from {state.summary.total} review(s)</span>
          </>
        )}
      </div>

      <div className="testimony-grid">
        {state.data.map((t) => (
          <article className="review-card" key={t.id}>
            <StarRating value={t.rating} size="sm" />
            <p>“{t.comment || 'Great stay!'}”</p>
            <div className="review-meta">
              <span>{t.guest}</span>
              <span>Room {t.room} · {t.date}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
import './StarRating.css';

const STARS = [1, 2, 3, 4, 5];

/**
 * value: the current rating (may be fractional for display)
 * onChange: if given, the stars are clickable and call onChange(1..5)
 * size: 'sm' | 'md' | 'lg'
 */
export default function StarRating({ value = 0, onChange, size = 'md', label }) {
  const interactive = typeof onChange === 'function';
  const shown = Math.round(Number(value) || 0);

  return (
    <div
      className={`stars stars-${size} ${interactive ? 'stars-interactive' : ''}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={label || `${value} out of 5 stars`}
    >
      {STARS.map((n) =>
        interactive ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={shown === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className={`star ${n <= shown ? 'on' : ''}`}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ) : (
          <span key={n} className={`star ${n <= shown ? 'on' : ''}`}>★</span>
        )
      )}
    </div>
  );
}
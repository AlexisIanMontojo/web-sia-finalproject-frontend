export function Skeleton({ className = '' }) {
  return <span className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}

export default function Loading({ label = 'Loading', className = '' }) {
  return (
    <div className={`loading-state ${className}`.trim()} role="status">
      <span className="loading-indicator" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
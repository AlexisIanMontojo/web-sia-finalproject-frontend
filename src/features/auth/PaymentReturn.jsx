import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function PaymentReturn() {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();

  const reservationId = searchParams.get('reservation_id') || '';
  const externalId = searchParams.get('external_id') || '';
  const result = searchParams.get('result') === 'failed' ? 'failed' : 'success';
  const destination = `/my-reservations?${new URLSearchParams({
    result,
    reservation_id: reservationId,
    external_id: externalId,
  }).toString()}`;

  if (status === 'loading') {
    return <div className="auth-loading">Restoring your session…</div>;
  }

  if (status === 'authenticated') {
    return <Navigate to={destination} replace />;
  }

  return (
    <Navigate
      to="/login"
      replace
      state={{ from: { pathname: '/my-reservations', search: destination.slice('/my-reservations'.length) } }}
    />
  );
}

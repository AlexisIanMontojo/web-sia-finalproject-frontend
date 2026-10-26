import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export default function ProtectedRoute({
  allowedRoles,
  loginPath = '/login',
}) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <div className="auth-loading">Loading...</div>;
  }

  if (!user) {
    return (
      <Navigate to={loginPath} replace state={{ from: location }} />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin/dashboard' : '/rooms'}
        replace
      />
    );
  }

  return <Outlet />;
}
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { homeFor } from '../lib/roles';

export default function ProtectedRoute({ allowedRoles, loginPath = '/login' }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <div className="auth-loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }

  return <Outlet />;
}
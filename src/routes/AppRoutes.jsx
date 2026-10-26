import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../features/auth/Login';
import Register from '../features/auth/Register';
import VerifyEmail from '../features/auth/VerifyEmail';
import AdminLogin from '../features/admin/AdminLogin';
import ProtectedRoute from './ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';
import AdminDashboard from '../features/admin/AdminDashboard';
import AdminPlaceholder from '../features/admin/AdminPlaceholder';
import CategoriesPage from '../features/admin/categories/CategoriesPage';
import RoomsPage from '../features/admin/rooms/RoomsPage';
import PricingPage from '../features/admin/pricing/PricingPage';
import CustomersPage from '../features/admin/customers/CustomersPage';
import ErrorBoundary from '../components/ErrorBoundary';


export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Customer area */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Administrator area */}
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          element={
            <ProtectedRoute allowedRoles={['admin']} loginPath="/admin/login" />
          }
        >
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/categories" element={<CategoriesPage />} />
            <Route path="/admin/rooms" element={<RoomsPage />} />
            <Route path="/admin/pricing" element={<PricingPage />} />
            <Route path="/admin/availability" element={<AdminPlaceholder title="Room Availability" />} />
            <Route path="/admin/reservations" element={<AdminPlaceholder title="Reservations" />} />
            <Route path="/admin/customers" element={<CustomersPage />} />
            <Route path="/admin/check-in-out" element={<AdminPlaceholder title="Check-in / Check-out" />} />
            <Route path="/admin/payments" element={<AdminPlaceholder title="Payments & Billing" />} />
            <Route path="/admin/notifications" element={<AdminPlaceholder title="Notifications" />} />
            <Route path="/admin/reports" element={<AdminPlaceholder title="Reports" />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
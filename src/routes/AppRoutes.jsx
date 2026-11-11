import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import { ADMIN_ROLES, MANAGER_ROLES, STAFF_ROLES } from '../lib/roles';
import ProtectedRoute from './ProtectedRoute';

// Customer pages
import Login from '../features/auth/Login';
import Register from '../features/auth/Register';
import VerifyEmail from '../features/auth/VerifyEmail';
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/ResetPasswordPage';
import PaymentReturn from '../features/auth/PaymentReturn';
import CustomerLayout from '../layouts/CustomerLayout';
import BrowseRoomsPage from '../features/customer/BrowseRoomsPage';
import BookingPage from '../features/customer/BookingPage';
import MyReservationsPage from '../features/customer/MyReservationsPage';
import ProfilePage from '../features/customer/ProfilePage';
import HotelInfoPage from '../features/customer/HotelInfoPage';
import ContactPage from '../features/customer/ContactPage';

// Staff and admin pages
import AdminLogin from '../features/admin/AdminLogin';
import AdminLayout from '../layouts/AdminLayout';
import AdminDashboard from '../features/admin/AdminDashboard';
import AdminPlaceholder from '../features/admin/AdminPlaceholder';
import StaffPage from '../features/admin/staff/StaffPage';
import HotelAdminPage from '../features/admin/hotel/HotelAdminPage';
import CategoriesPage from '../features/admin/categories/CategoriesPage';
import RoomsPage from '../features/admin/rooms/RoomsPage';
import PricingPage from '../features/admin/pricing/PricingPage';
import AvailabilityPage from '../features/admin/availability/AvailabilityPage';
import ReservationsPage from '../features/admin/reservations/ReservationsPage';
import CustomersPage from '../features/admin/customers/CustomersPage';
import CheckinOutPage from '../features/admin/checkinout/CheckinOutPage';
import NotificationsPage from '../features/admin/notifications/NotificationsPage';
import ReviewsPage from '../features/admin/reviews/ReviewsPage';
import ServiceRequestsPage from '../features/admin/services/ServiceRequestsPage';
import PaymentsPage from '../features/admin/payments/PaymentsPage';

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/rooms" replace />} />

        {/* Customer area */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/payment-return" element={<PaymentReturn />} />

        <Route element={<CustomerLayout />}>
          <Route path="/rooms" element={<BrowseRoomsPage />} />
          <Route path="/hotel" element={<HotelInfoPage />} />

          <Route element={<ProtectedRoute allowedRoles={['customer']} loginPath="/login" />}>
            <Route path="/book" element={<BookingPage />} />
            <Route path="/my-reservations" element={<MyReservationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Route>
        </Route>

        {/* Staff, manager, and admin area */}
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<ProtectedRoute allowedRoles={STAFF_ROLES} loginPath="/admin/login" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Manager and admin */}
            <Route element={<ProtectedRoute allowedRoles={MANAGER_ROLES} loginPath="/admin/login" />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/categories" element={<CategoriesPage />} />
              <Route path="/admin/rooms" element={<RoomsPage />} />
              <Route path="/admin/pricing" element={<PricingPage />} />
              <Route path="/admin/payments" element={<PaymentsPage />} />
              <Route path="/admin/reviews" element={<ReviewsPage />} />
              <Route path="/admin/reports" element={<AdminPlaceholder title="Reports" />} />
            </Route>

            {/* Admin only */}
            <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} loginPath="/admin/login" />}>
              <Route path="/admin/staff" element={<StaffPage />} />
              <Route path="/admin/hotel" element={<HotelAdminPage />} />
            </Route>

            {/* Front desk, manager, and admin */}
            <Route element={<ProtectedRoute allowedRoles={STAFF_ROLES} loginPath="/admin/login" />}>
              <Route path="/admin/availability" element={<AvailabilityPage />} />
              <Route path="/admin/reservations" element={<ReservationsPage />} />
              <Route path="/admin/customers" element={<CustomersPage />} />
              <Route path="/admin/check-in-out" element={<CheckinOutPage />} />
              <Route path="/admin/notifications" element={<NotificationsPage />} />
              <Route path="/admin/services" element={<ServiceRequestsPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
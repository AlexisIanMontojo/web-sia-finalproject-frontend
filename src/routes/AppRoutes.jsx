import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../features/auth/Login';
import Register from '../features/auth/Register';
import VerifyEmail from '../features/auth/VerifyEmail';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
    </Routes>
  );
}

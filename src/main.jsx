import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { AuthProvider } from './features/auth/AuthContext';
import './index.css'; // keep whatever global CSS you already import

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const app = googleClientId ? (
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>
) : (
  <App />
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {app}
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
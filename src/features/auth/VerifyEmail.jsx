import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import './VerifyEmail.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    let cancelled = false;

    async function verifyEmail() {
      if (!token) {
        setStatus('error');
        setMessage('The verification link is missing its token.');
        return;
      }

      try {
        const response = await api.post('/api/auth/verify-email', {
          token,
        });

        if (cancelled) return;

        if (response.data?.success) {
          setStatus('success');
          setMessage(
            response.data.message || 'Your email has been verified successfully.'
          );
        } else {
          setStatus('error');
          setMessage(
            response.data?.message || 'Email verification failed. The link may be invalid or expired.'
          );
        }
      } catch (error) {
        if (cancelled) return;

        setStatus('error');
        setMessage(
          error.response?.data?.message ||
          'We could not verify your email. The link may have expired, or the server may be unavailable.'
        );
      }
    }

    verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="verify-page">
      <section className="verify-card">
        <h1>Email Verification</h1>

        {status === 'loading' && (
          <div className="verify-icon" aria-hidden="true">⏳</div>
        )}

        {status === 'success' && (
          <div className="verify-icon success" aria-hidden="true">✓</div>
        )}

        {status === 'error' && (
          <div className="verify-icon error" aria-hidden="true">!</div>
        )}

        <p role="status" aria-live="polite">{message}</p>

        {status !== 'loading' && (
          <Link className="verify-link" to="/login">
            Go to Login
          </Link>
        )}
      </section>
    </main>
  );
}

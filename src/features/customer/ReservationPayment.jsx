import { useEffect, useState } from 'react';
import { paymentsApi } from './customerService';
import { showError } from '../../lib/alerts';
import '../../layouts/Customer.css';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const STATUS_TEXT = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  expired: 'Expired',
  failed: 'Failed',
};

const STATUS_TAG = {
  pending: 'tag-unread',
  paid: 'tag-ok',
  expired: 'tag-warn',
  failed: 'tag-warn',
};

export default function ReservationPayment({ reservation }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [paying, setPaying] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await paymentsApi.list(reservation.id);
      setInfo(data);
    } catch (err) {
      showError('Could not load payments', err.response?.data?.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [reservation.id]);

  async function payDownpayment() {
    setPaying(true);
    try {
      const { data } = await paymentsApi.downpayment(reservation.id);
      window.location.href = data.invoice_url;
    } catch (err) {
      showError('Cannot start payment', err.response?.data?.message || 'Try again.');
      setPaying(false);
    }
  }

  if (loading && !info) return <p className="muted">Loading payments…</p>;
  if (!info) return null;

  return (
    <div className="services-box">
      <h4>Payment</h4>

      <div className="quote-row">
        <span>Total</span>
        <span>{peso.format(info.total)}</span>
      </div>
      <div className="quote-row">
        <span>Paid</span>
        <span>{peso.format(info.paid)}</span>
      </div>
      <div className="quote-row quote-total">
        <span>Balance</span>
        <span>{peso.format(info.balance)}</span>
      </div>

      {info.data.length > 0 && (
        <div className="stack">
          {info.data.map((p) => (
            <div className="service-row" key={p.id}>
              <span>{p.kind === 'downpayment' ? 'Downpayment' : 'Balance'}</span>
              <span>{peso.format(p.amount)}</span>
              <span className={`tag ${STATUS_TAG[p.status] || ''}`}>
                {STATUS_TEXT[p.status] || p.status}
              </span>
              {p.status === 'paid' && p.paid_at && (
                <span className="muted">{p.paid_at.slice(0, 16)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {info.downpayment_due > 0 && (
        <div className="map-actions">
          <button className="btn-main" disabled={paying} onClick={payDownpayment}>
            {paying ? 'Opening payment…' : `Pay downpayment ${peso.format(info.downpayment_due)}`}
          </button>
        </div>
      )}

      <p className="muted">
        After paying, reload this page to see the update. The hotel still confirms your booking.
      </p>
    </div>
  );
}
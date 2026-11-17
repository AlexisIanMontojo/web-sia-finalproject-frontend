import { useCallback, useEffect, useState } from 'react';
import { paymentsApi } from './customerService';
import { showError, toast } from '../../lib/alerts';
import { useCachedFetch } from '../../lib/cache';
import '../../layouts/Customer.css';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const fetchPayments = async (id, externalId, force = false) => {
  const { data } = await paymentsApi.list(id, externalId, force);
  return data;
};

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

const PAYMENT_LABEL = {
  downpayment: 'Downpayment',
  full: 'Full payment',
  service: 'Extra services',
  balance: 'Balance payment',
};

export default function ReservationPayment({ reservation, verifyExternalId = '' }) {
  const [amountType, setAmountType] = useState('downpayment');
  const [method, setMethod] = useState('xendit');
  const [paying, setPaying] = useState(false);
  const [checking, setChecking] = useState(false);

  const fetcher = useCallback(
    () => fetchPayments(reservation.id, verifyExternalId),
    [reservation.id, verifyExternalId]
  );
  const paymentState = useCachedFetch(
    `customer:reservation-payments:${reservation.id}:${verifyExternalId || 'current'}`,
    fetcher
  );
  const info = paymentState.data;
  const loading = paymentState.loading;

  useEffect(() => {
    if (paymentState.error) {
      showError('Could not load payments', paymentState.error.response?.data?.message || 'Try again.');
    }
  }, [paymentState.error]);

  async function pay() {
    setPaying(true);
    try {
      const { data } = await paymentsApi.reservationPayment(reservation.id, {
        amount_type: selectedAmountType,
        method,
      });

      if (data.provider === 'xendit' && data.invoice_url) {
        window.location.assign(data.invoice_url);
        return;
      }

      toast('success', 'Cash payment requested. Please pay the hotel in person.');
      try {
        paymentState.setData(await fetchPayments(reservation.id, verifyExternalId, true));
      } catch (err) {
        showError(
          'Cash payment was requested, but the payment status could not be refreshed',
          err.response?.data?.message || 'Reopen this section to check again.'
        );
      }
    } catch (err) {
      showError('Cannot start payment', err.response?.data?.message || 'Try again.');
    } finally {
      setPaying(false);
    }
  }

  async function refreshStatus() {
    setChecking(true);
    try {
      paymentState.setData(await fetchPayments(reservation.id, verifyExternalId, true));
    } catch (err) {
      showError('Could not refresh payment status', err.response?.data?.message || 'Try again.');
    } finally {
      setChecking(false);
    }
  }

  if (loading && !info) return <p className="muted">Loading payments…</p>;
  if (!info) return null;

  const payments = Array.isArray(info.data) ? info.data : [];
  const pendingPayment = payments.find((payment) =>
    payment.status === 'pending' && payment.kind !== 'service'
  );
  const reservationBalance = Number(info.reservation_balance ?? info.balance);
  const hasPaid = Number(info.reservation_paid ?? info.paid) > 0;
  const selectedAmountType = hasPaid
    ? 'balance'
    : reservation.status === 'checked_out'
      ? 'full'
      : amountType;
  const paymentAmount = selectedAmountType === 'downpayment'
    ? info.downpayment_due
    : reservationBalance;

  return (
    <div className="services-box">
      <h4>Payment</h4>

      <div className="quote-row">
        <span>Stay charges</span>
        <span>{peso.format(info.reservation_total ?? reservation.total_amount)}</span>
      </div>
      <div className="quote-row">
        <span>Extra service charges</span>
        <span>{peso.format(info.service_total || 0)}</span>
      </div>
      <div className="quote-row">
        <span>Total charges</span>
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

      {payments.length > 0 && (
        <div className="stack">
          {payments.map((p) => (
            <div className="service-row" key={p.id}>
              <span>{PAYMENT_LABEL[p.kind] || 'Balance payment'}</span>
              <span className="muted">{p.provider === 'cash' ? 'Cash' : 'Xendit'}</span>
              <span>{peso.format(p.amount)}</span>
              <span className={`tag ${STATUS_TAG[p.status] || ''}`}>
                {STATUS_TEXT[p.status] || p.status}
              </span>
              {p.status === 'paid' && p.paid_at ? (
                <span className="muted">{p.paid_at.slice(0, 16)}</span>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      )}

      {pendingPayment && (
        <div className="map-actions">
          {pendingPayment.provider === 'xendit' && pendingPayment.invoice_url ? (
            <button
              className="btn-main"
              onClick={() => window.location.assign(pendingPayment.invoice_url)}
            >
              Continue Xendit {pendingPayment.kind === 'balance' ? 'balance payment' : 'payment'}{' '}
              {peso.format(pendingPayment.amount)}
            </button>
          ) : (
            <p className="muted">
              Cash {pendingPayment.kind === 'balance' ? 'balance payment' : 'payment'} of{' '}
              {peso.format(pendingPayment.amount)} is awaiting confirmation. Please pay the hotel in person.
            </p>
          )}
        </div>
      )}

      {!pendingPayment && info.open && reservationBalance > 0 && (
        <div className="stack">
          {!hasPaid && reservation.status !== 'checked_out' ? (
            <fieldset className="payment-choice">
              <legend>Payment amount</legend>
              <label>
                <input
                  type="radio"
                  name={`amount-${reservation.id}`}
                  value="downpayment"
                  checked={amountType === 'downpayment'}
                  disabled={paying}
                  onChange={() => setAmountType('downpayment')}
                />
                Downpayment · {peso.format(info.downpayment_due)}
              </label>
              <label>
                <input
                  type="radio"
                  name={`amount-${reservation.id}`}
                  value="full"
                  checked={amountType === 'full'}
                  disabled={paying}
                  onChange={() => setAmountType('full')}
                />
                Pay in full · {peso.format(reservationBalance)}
              </label>
            </fieldset>
          ) : (
            <p className="muted">
              {hasPaid ? 'Downpayment received. ' : ''}
              Remaining reservation balance: {peso.format(reservationBalance)}
            </p>
          )}

          <fieldset className="payment-choice">
            <legend>Payment method</legend>
            <label>
              <input
                type="radio"
                name={`method-${reservation.id}`}
                value="xendit"
                checked={method === 'xendit'}
                disabled={paying}
                onChange={() => setMethod('xendit')}
              />
              Xendit
            </label>
            <label>
              <input
                type="radio"
                name={`method-${reservation.id}`}
                value="cash"
                checked={method === 'cash'}
                disabled={paying}
                onChange={() => setMethod('cash')}
              />
              Cash at the hotel
            </label>
          </fieldset>

          <button className="btn-main" disabled={paying} onClick={pay}>
            {paying
              ? method === 'xendit' ? 'Opening Xendit…' : 'Requesting cash payment…'
              : hasPaid
                ? method === 'xendit'
                  ? `Pay remaining balance ${peso.format(paymentAmount)} with Xendit`
                  : `Request cash payment for ${peso.format(paymentAmount)} balance`
                : method === 'xendit'
                  ? `Continue to Xendit · ${peso.format(paymentAmount)}`
                  : `Request cash payment · ${peso.format(paymentAmount)}`}
          </button>
        </div>
      )}

      {payments.some((payment) => payment.status === 'pending') && (
        <div className="map-actions">
          <button className="btn-outline" disabled={checking} onClick={refreshStatus}>
            {checking ? 'Checking…' : 'Refresh payment status'}
          </button>
        </div>
      )}

      <p className="muted">
        Xendit payments are verified automatically. Cash is marked paid by the hotel after it is received.
        The hotel confirms your reservation.
      </p>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { catalogueApi, reservationsApi } from './customerService';
import '../../layouts/Customer.css';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const API_BASE = import.meta.env.VITE_API_URL || '';

function photoSrc(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

export default function BookingPage() {
  const [params] = useSearchParams();
  const roomId = params.get('room');
  const checkIn = params.get('check_in') || '';
  const checkOut = params.get('check_out') || '';
  const guests = Math.max(1, Number(params.get('guests') || 1));

  const [room, setRoom] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [booked, setBooked] = useState(null);

  useEffect(() => {
    if (!roomId) {
      setErrors(['Choose a room from the rooms page first.']);
      setLoading(false);
      return;
    }

    const query = { guests };
    if (checkIn) query.check_in = checkIn;
    if (checkOut) query.check_out = checkOut;

    setLoading(true);
    catalogueApi
      .room(roomId, query)
      .then(({ data }) => setRoom(data.room))
      .catch((err) =>
        setErrors(
          err.response?.data?.errors || [err.response?.data?.message || 'Could not load this room.']
        )
      )
      .finally(() => setLoading(false));
  }, [roomId, checkIn, checkOut, guests]);

  const hasDates = Boolean(checkIn && checkOut);
  const quote = room?.quote;
  const canConfirm = hasDates && room?.available && Boolean(quote) && !saving;

  async function confirm() {
    setSaving(true);
    setErrors([]);
    try {
      const { data } = await reservationsApi.create({
        room_id: room.id,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        special_requests: notes,
      });
      setBooked(data.data);
    } catch (err) {
      setErrors(
        err.response?.data?.errors || [err.response?.data?.message || 'Booking failed.']
      );
    } finally {
      setSaving(false);
    }
  }

  if (booked) {
    return (
      <section className="panel stack">
        <div className="ok-box">Reservation submitted. The hotel will confirm it shortly.</div>
        <h2>Reservation {booked.reservation_code}</h2>
        <p>Room {booked.room_number} · {booked.category_name}</p>
        <p>
          {booked.check_in_date} to {booked.check_out_date} · {booked.guests} guest(s)
        </p>
        <p><strong>Total: {peso.format(booked.total_amount)}</strong></p>
        <p className="muted">Status: pending hotel confirmation.</p>
        <div>
          <Link to="/my-reservations" className="btn-main">View my reservations</Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="booking-head">
        <Link to="/rooms" className="btn-soft">← Back to rooms</Link>
      </div>

      {errors.length > 0 && (
        <div className="error-box">
          {errors.map((m) => (
            <div key={m}>{m}</div>
          ))}
        </div>
      )}

      {loading && <p>Loading room…</p>}

      {!loading && room && (
        <div className="booking-layout">
          <div className="panel stack">
            {photoSrc(room.image_url) ? (
              <img
                className="room-photo booking-photo"
                src={photoSrc(room.image_url)}
                alt={`Room ${room.room_number}`}
              />
            ) : (
              <div className="room-photo room-photo-empty booking-photo">
                Room {room.room_number}
              </div>
            )}

            <h2>Room {room.room_number} · {room.category_name}</h2>

            <div className="room-meta">
              <span>Up to {room.capacity} guests</span>
              {room.floor_number !== null && <span>Floor {room.floor_number}</span>}
            </div>

            {room.description && <p>{room.description}</p>}

            {room.amenities.length > 0 && (
              <>
                <h3>Amenities</h3>
                <div className="chips">
                  {room.amenities.map((a) => (
                    <span className="chip" key={a}>{a}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="panel stack">
            <h3>Your stay</h3>

            {hasDates ? (
              <p>
                {checkIn} → {checkOut} · {guests} guest(s)
              </p>
            ) : (
              <div className="error-box">
                Choose check-in and check-out dates on the rooms page to see availability and your total.
              </div>
            )}

            {hasDates && !room.available && (
              <div className="error-box">
                This room is not available for these dates. Go back and choose another room.
              </div>
            )}

            {quote && (
              <div>
                <div className="quote-row">
                  <span>{peso.format(quote.nightly_rate)} × {quote.nights} night(s)</span>
                  <span>{peso.format(quote.nightly_rate * quote.nights)}</span>
                </div>
                {quote.extra_guest_charges > 0 && (
                  <div className="quote-row">
                    <span>Extra guests</span>
                    <span>{peso.format(quote.extra_guest_charges)}</span>
                  </div>
                )}
                {quote.cleaning_fee > 0 && (
                  <div className="quote-row">
                    <span>Cleaning fee</span>
                    <span>{peso.format(quote.cleaning_fee)}</span>
                  </div>
                )}
                <div className="quote-row quote-total">
                  <span>Total</span>
                  <span>{peso.format(quote.total)}</span>
                </div>
              </div>
            )}

            <label className="field-label">
              Special requests (optional)
              <textarea
                className="input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

            <button className="btn-main" onClick={confirm} disabled={!canConfirm}>
              {saving ? 'Submitting…' : 'Submit reservation'}
            </button>
            <p className="muted">Your booking stays pending until the hotel confirms it.</p>
          </div>
        </div>
      )}
    </section>
  );
}
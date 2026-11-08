import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogueApi } from './customerService';
import { useCachedFetch } from '../../lib/cache';
import '../../layouts/Customer.css';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const API_BASE = import.meta.env.VITE_API_URL || '';

const STATUS_TEXT = {
  maintenance: 'Under maintenance',
  out_of_service: 'Out of service',
};

const BROWSE = { check_in: '', check_out: '', guests: 1, category_id: '' };

function localDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function photoSrc(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

function toQuery(p) {
  const q = { guests: p.guests || 1 };
  if (p.check_in) q.check_in = p.check_in;
  if (p.check_out) q.check_out = p.check_out;
  if (p.category_id) q.category_id = p.category_id;
  return q;
}

function isBrowseAll(p) {
  return !p.check_in && !p.check_out && Number(p.guests) === 1 && !p.category_id;
}

function availabilityBadge(room, hasDates) {
  if (!hasDates) return { text: 'Choose dates to check', cls: 'badge-info' };
  if (room.available) return { text: 'Available for your dates', cls: 'badge-avail' };
  if (!room.bookable) return { text: STATUS_TEXT[room.status] || 'Unavailable', cls: 'badge-no' };
  if (!room.fits_guests) return { text: `Holds up to ${room.capacity} guests`, cls: 'badge-no' };
  return { text: 'Booked for these dates', cls: 'badge-busy' };
}

export default function BrowseRoomsPage() {
  const navigate = useNavigate();

  // The default catalogue (no dates, all types, 1 guest) is cached and refreshed in the background.
  const defaultCatalogue = useCachedFetch('public:rooms:default', () =>
    catalogueApi.rooms(toQuery(BROWSE)).then(({ data }) => data)
  );

  const [form, setForm] = useState(BROWSE);
  const [searched, setSearched] = useState(null);
  const [searchError, setSearchError] = useState([]);
  const [searching, setSearching] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Use the cached catalogue until the visitor runs a search.
  const result = searched ?? defaultCatalogue.data;
  const loading = !result && defaultCatalogue.loading;

  const hasDates = Boolean(result?.search?.has_dates);

  const rooms = useMemo(() => {
    const list = result?.data || [];
    return onlyAvailable && hasDates ? list.filter((r) => r.available) : list;
  }, [result, onlyAvailable, hasDates]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function runSearch(params) {
    setSearching(true);
    setSearchError([]);
    try {
      const { data } = await catalogueApi.rooms(toQuery(params));
      if (isBrowseAll(params)) {
        setSearched(null);
      } else {
        setSearched(data);
      }
    } catch (err) {
      setSearchError(
        err.response?.data?.errors || [err.response?.data?.message || 'Could not load rooms.']
      );
    } finally {
      setSearching(false);
    }
  }

  function submit(e) {
    e.preventDefault();

    if ((form.check_in && !form.check_out) || (!form.check_in && form.check_out)) {
      setSearchError(['Choose both check-in and check-out dates, or leave both empty to browse all rooms.']);
      return;
    }

    runSearch(form);
  }

  function browseAll() {
    const cleared = { ...form, check_in: '', check_out: '' };
    setForm(cleared);
    setOnlyAvailable(false);
    runSearch(cleared);
  }

  function book(room) {
    const q = new URLSearchParams({
      room: String(room.id),
      guests: String(result.search.guests),
      check_in: result.search.check_in,
      check_out: result.search.check_out,
    });
    navigate(`/book?${q.toString()}`);
  }

  return (
    <section>
      <div className="hero">
        <h1>Browse our rooms</h1>
        <p>
          See every room with its photos, amenities, and rates. Choose your dates to check
          which rooms are free for your stay.
        </p>
      </div>

      <form className="search-bar" onSubmit={submit}>
        <label className="field-label">
          Check-in
          <input
            className="input"
            type="date"
            name="check_in"
            min={localDate(0)}
            value={form.check_in}
            onChange={handleChange}
          />
        </label>
        <label className="field-label">
          Check-out
          <input
            className="input"
            type="date"
            name="check_out"
            min={form.check_in || localDate(1)}
            value={form.check_out}
            onChange={handleChange}
          />
        </label>
        <label className="field-label">
          Guests
          <input
            className="input"
            type="number"
            min="1"
            max="20"
            name="guests"
            value={form.guests}
            onChange={handleChange}
          />
        </label>
        <label className="field-label">
          Room type
          <select className="input" name="category_id" value={form.category_id} onChange={handleChange}>
            <option value="">All room types</option>
            {(defaultCatalogue.data?.categories || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="search-actions">
          <button className="btn-main" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
          {hasDates && (
            <button type="button" className="btn-soft" onClick={browseAll}>
              Browse all
            </button>
          )}
        </div>
      </form>

      <div className="results-bar">
        <p className="muted">
          {loading
            ? 'Loading rooms…'
            : `${rooms.length} room${rooms.length === 1 ? '' : 's'} shown`}
          {hasDates &&
            !loading &&
            ` · ${result.summary.available} free from ${result.search.check_in} to ${result.search.check_out}`}
        </p>
        {hasDates && (
          <label className="check-only">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
            />
            Only show available rooms
          </label>
        )}
      </div>

      {searchError.length > 0 && (
        <div className="error-box">
          {searchError.map((m) => (
            <div key={m}>{m}</div>
          ))}
        </div>
      )}

      {!loading && rooms.length === 0 && (
        <div className="panel">
          No rooms match your search. Try other dates, fewer guests, or another room type.
        </div>
      )}

      <div className="room-grid">
        {rooms.map((room) => {
          const badge = availabilityBadge(room, hasDates);
          const photo = photoSrc(room.image_url);
          const canBook = hasDates && room.available && Boolean(room.quote);

          const priceLine = room.quote
            ? peso.format(room.quote.total)
            : room.base_nightly_rate !== null
              ? `${peso.format(room.base_nightly_rate)} / night`
              : 'Price not set';

          const priceNote = room.quote
            ? `${room.quote.nights} night(s) · ${peso.format(room.quote.nightly_rate)} per night`
            : hasDates
              ? 'No rate set for these dates'
              : 'Choose dates to see your total';

          return (
            <article className="room-card" key={room.id}>
              {photo ? (
                <img className="room-photo" src={photo} alt={`Room ${room.room_number}`} loading="lazy" />
              ) : (
                <div className="room-photo room-photo-empty">Room {room.room_number}</div>
              )}

              <div className="room-head">
                <h3>Room {room.room_number}</h3>
                <span className={`badge-soft ${badge.cls}`}>{badge.text}</span>
              </div>

              <div className="room-meta">
                <span>{room.category_name}</span>
                <span>Up to {room.capacity} guests</span>
                {room.floor_number !== null && <span>Floor {room.floor_number}</span>}
              </div>

              {room.description && <p className="muted">{room.description}</p>}

              {room.amenities.length > 0 && (
                <div className="chips">
                  {room.amenities.map((a) => (
                    <span className="chip" key={a}>{a}</span>
                  ))}
                </div>
              )}

              <div className="price">{priceLine}</div>
              <div className="price-sub">{priceNote}</div>

              <button className="btn-main" disabled={!canBook} onClick={() => book(room)}>
                {!hasDates ? 'Choose dates to book' : canBook ? 'Book this room' : 'Not available'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
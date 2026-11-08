import { useEffect, useState } from 'react';
import { hotelAdminApi } from '../adminService';
import { toast, showError } from '../../../lib/alerts';
import LocationPicker from '../../../components/LocationPicker';
import '../../../layouts/Admin.css';
import { useCachedFetch, invalidate } from '../../../lib/cache';

const fetchHotelAdmin = async () => {
  const { data } = await hotelAdminApi.get();
  return data.hotel;
};

const EMPTY_DETAILS = {
  name: '',
  address: '',
  phone: '',
  email: '',
  check_in_time: '',
  check_out_time: '',
  amenities: '',
  policies: '',
};

// Turns the text in a coordinate field into a number, or null if it isn't one yet.
function parseCoord(text) {
  if (text === '' || text === '-' || text === '.') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

// Opens the current pin in Google Maps, in a new tab.
function googleMapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function HotelAdminPage() {
  const [details, setDetails] = useState(EMPTY_DETAILS);

  // Kept as text so the admin can type freely (for example "13.2" on the way to "13.2333").
  const [coords, setCoords] = useState({ lat: '', lng: '' });

  const [detailErrors, setDetailErrors] = useState([]);
  const [mapErrors, setMapErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingMap, setSavingMap] = useState(false);
  const hotelState = useCachedFetch('admin:hotel', fetchHotelAdmin);

  useEffect(() => {
    const h = hotelState.data;
    if (!h) return;
    setDetails({
      name: h.name || '',
      address: h.address || '',
      phone: h.phone || '',
      email: h.email || '',
      check_in_time: h.check_in_time || '',
      check_out_time: h.check_out_time || '',
      amenities: (h.amenities || []).join('\n'),
      policies: (h.policies || []).join('\n'),
    });
    setCoords({
      lat: h.latitude != null ? String(h.latitude) : '',
      lng: h.longitude != null ? String(h.longitude) : '',
    });
  }, [hotelState.data]);


  useEffect(() => {
    hotelAdminApi
      .get()
      .then(({ data }) => {
        const h = data.hotel;
        setDetails({
          name: h.name || '',
          address: h.address || '',
          phone: h.phone || '',
          email: h.email || '',
          check_in_time: h.check_in_time || '',
          check_out_time: h.check_out_time || '',
          amenities: (h.amenities || []).join('\n'),
          policies: (h.policies || []).join('\n'),
        });
        setCoords({
          lat: h.latitude != null ? String(h.latitude) : '',
          lng: h.longitude != null ? String(h.longitude) : '',
        });
      })
      .catch((err) =>
        showError('Could not load hotel information', err.response?.data?.message || 'Try again.')
      )
      .finally(() => setLoading(false));
  }, []);

  const lat = parseCoord(coords.lat);
  const lng = parseCoord(coords.lng);
  const validCoords =
    lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  function onDetail(e) {
    setDetails((d) => ({ ...d, [e.target.name]: e.target.value }));
  }

  // Typing in latitude or longitude moves the map pin.
  function onCoordInput(e) {
    setCoords((c) => ({ ...c, [e.target.name]: e.target.value }));
  }

  // Clicking or dragging the pin fills the two fields.
  function onMapPick(p) {
    setCoords({ lat: p.lat.toFixed(7), lng: p.lng.toFixed(7) });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      showError('Not supported', 'Your browser cannot find your location. Type the coordinates instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => onMapPick({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => showError('Location unavailable', 'Allow location access, or type the coordinates instead.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function saveDetails(e) {
    e.preventDefault();
    setSavingDetails(true);
    setDetailErrors([]);
    try {
      await hotelAdminApi.update(details);
      toast('success', 'Hotel details saved');
    } catch (err) {
      setDetailErrors(err.response?.data?.errors || [err.response?.data?.message || 'Save failed.']);
    } finally {
      setSavingDetails(false);
    }
  }

  async function saveMap(e) {
    e.preventDefault();
    setSavingMap(true);
    setMapErrors([]);
    try {
      await hotelAdminApi.updateMap({ latitude: lat, longitude: lng });
      toast('success', 'Location saved');
    } catch (err) {
      setMapErrors(err.response?.data?.errors || [err.response?.data?.message || 'Save failed.']);
    } finally {
      setSavingMap(false);
    }
  }

  if (loading) {
    return <div className="admin-loading">Loading hotel information…</div>;
  }

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Hotel Information</h1>
          <p className="admin-page-subtitle">
            What customers see on the hotel page: details, policies, and location.
          </p>
        </div>
      </div>

      <div className="hotel-admin-grid">
        <form className="panel stack" onSubmit={saveDetails}>
          <h3>Hotel details</h3>

          {detailErrors.length > 0 && (
            <div className="auth-message auth-error" role="alert">
              {detailErrors.map((m) => (
                <div key={m}>{m}</div>
              ))}
            </div>
          )}

          <label className="field">
            <span>Hotel name</span>
            <input name="name" className="input" value={details.name} onChange={onDetail} required />
          </label>

          <label className="field">
            <span>Address</span>
            <input name="address" className="input" value={details.address} onChange={onDetail} required />
          </label>

          <div className="form-row">
            <label className="field">
              <span>Phone</span>
              <input name="phone" className="input" value={details.phone} onChange={onDetail} />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" className="input" value={details.email} onChange={onDetail} />
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              <span>Check-in time</span>
              <input name="check_in_time" className="input" placeholder="2:00 PM" value={details.check_in_time} onChange={onDetail} />
            </label>
            <label className="field">
              <span>Check-out time</span>
              <input name="check_out_time" className="input" placeholder="12:00 NN" value={details.check_out_time} onChange={onDetail} />
            </label>
          </div>

          <label className="field">
            <span>Amenities (one per line)</span>
            <textarea name="amenities" rows={4} className="input" value={details.amenities} onChange={onDetail} />
          </label>

          <label className="field">
            <span>Policies (one per line)</span>
            <textarea name="policies" rows={4} className="input" value={details.policies} onChange={onDetail} />
          </label>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary" disabled={savingDetails}>
              {savingDetails ? 'Saving…' : 'Save details'}
            </button>
          </div>
        </form>

        <form className="panel stack" onSubmit={saveMap}>
          <h3>Location</h3>
          <p className="muted">
            Click the map or drag the pin, or type the latitude and longitude. The fields and the pin always match.
          </p>

          {mapErrors.length > 0 && (
            <div className="auth-message auth-error" role="alert">
              {mapErrors.map((m) => (
                <div key={m}>{m}</div>
              ))}
            </div>
          )}

          <LocationPicker value={{ lat, lng }} onChange={onMapPick} />

          <div className="form-row">
            <label className="field">
              <span>Latitude</span>
              <input
                name="lat"
                type="text"
                inputMode="decimal"
                className="input"
                placeholder="13.2333000"
                value={coords.lat}
                onChange={onCoordInput}
              />
            </label>
            <label className="field">
              <span>Longitude</span>
              <input
                name="lng"
                type="text"
                inputMode="decimal"
                className="input"
                placeholder="120.5986000"
                value={coords.lng}
                onChange={onCoordInput}
              />
            </label>
          </div>

          {coords.lat !== '' && coords.lng !== '' && !validCoords && (
            <div className="auth-message auth-error">
              Latitude must be between -90 and 90, and longitude between -180 and 180.
            </div>
          )}

          <div className="map-actions">
            <button type="button" className="btn btn-ghost" onClick={useMyLocation}>
              Use my current location
            </button>

            {validCoords && (
              <a
                className="btn btn-ghost"
                href={googleMapsUrl(lat, lng)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Maps
              </a>
            )}
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary" disabled={savingMap || !validCoords}>
              {savingMap ? 'Saving…' : 'Save location'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
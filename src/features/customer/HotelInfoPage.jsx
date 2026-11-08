import { hotelApi, mapApi } from './customerService';
import { useCachedFetch } from '../../lib/cache';
import LocationPicker from '../../components/LocationPicker';
import TestimonialsSection from './TestimonialsSection';
import '../../layouts/Customer.css';

const fetchHotelPage = async () => {
  const [info, mapRes] = await Promise.all([hotelApi.info(), mapApi.get()]);
  return {
    hotel: info.data.hotel,
    map: mapRes.data.configured ? mapRes.data.map : null,
  };
};

export default function HotelInfoPage() {
  const { data, loading, error } = useCachedFetch('public:hotel', fetchHotelPage);

  if (error) {
    return (
      <div className="error-box">
        {error.response?.data?.message || 'Could not load hotel information.'}
      </div>
    );
  }

  if (!data) {
    return <p>Loading…</p>;
  }

  const { hotel, map } = data;

  return (
    <section className="stack">
      <div className="hero">
        <h1>{hotel.name}</h1>
        <p>{hotel.address}</p>
      </div>

      <div className="panel">
        <h3>Contact</h3>
        {hotel.phone && <p>Phone: {hotel.phone}</p>}
        {hotel.email && <p>Email: {hotel.email}</p>}
        {(hotel.check_in_time || hotel.check_out_time) && (
          <p>
            Check-in: {hotel.check_in_time || '—'} · Check-out: {hotel.check_out_time || '—'}
          </p>
        )}
      </div>

      {hotel.amenities.length > 0 && (
        <div className="panel">
          <h3>Amenities</h3>
          <div className="chips">
            {hotel.amenities.map((a) => (
              <span className="chip" key={a}>{a}</span>
            ))}
          </div>
        </div>
      )}

      {hotel.policies.length > 0 && (
        <div className="panel">
          <h3>Policies</h3>
          <ul>
            {hotel.policies.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel stack">
        <h3>Location</h3>
        {map ? (
          <>
            <LocationPicker readOnly value={{ lat: map.latitude, lng: map.longitude }} />
            <div className="map-actions">
              <a className="btn-main" href={map.directions_url} target="_blank" rel="noopener noreferrer">
                Get directions
              </a>
              <a
                className="btn-soft"
                href={`https://www.google.com/maps?q=${map.latitude},${map.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Maps
              </a>
            </div>
          </>
        ) : (
          <p className="muted">The map location has not been set yet.</p>
        )}
      </div>

      <TestimonialsSection />
    </section>
  );
}
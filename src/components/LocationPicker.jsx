import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationPicker.css';

// Mamburao, Occidental Mindoro: the starting view when no location is set.
const DEFAULT_CENTER = { lat: 13.2333, lng: 120.5986 };
const DEFAULT_ZOOM = 15;

const pinIcon = L.divIcon({
  className: 'map-pin',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Moves the view to the pin when the value changes from outside (for example, "Use my location").
function Recenter({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    const here = map.getCenter();
    const moved =
      Math.abs(here.lat - position.lat) > 0.00005 ||
      Math.abs(here.lng - position.lng) > 0.00005;
    if (moved) map.panTo([position.lat, position.lng]);
  }, [position, map]);

  return null;
}

// Places the pin where the admin clicks.
function ClickToPlace({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/**
 * value: { lat, lng } (either may be null)
 * onChange: called with { lat, lng } when the admin clicks or drags the pin
 * readOnly: shows the map without editing (used on the customer page)
 */
export default function LocationPicker({ value, onChange, readOnly = false }) {
  const position =
    value && value.lat !== null && value.lat !== undefined &&
    value.lng !== null && value.lng !== undefined
      ? { lat: Number(value.lat), lng: Number(value.lng) }
      : null;

  const center = position || DEFAULT_CENTER;
  const markerRef = useRef(null);

  const handlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker && onChange) {
          const p = marker.getLatLng();
          onChange({ lat: p.lat, lng: p.lng });
        }
      },
    }),
    [onChange]
  );

  return (
    <div className={`location-picker ${readOnly ? 'location-picker-readonly' : ''}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={!readOnly}
        dragging={!readOnly}
        doubleClickZoom={!readOnly}
        touchZoom={!readOnly}
        className="location-picker-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {!readOnly && <ClickToPlace onPick={onChange} />}

        {position && (
          <>
            <Recenter position={position} />
            <Marker
              ref={markerRef}
              position={[position.lat, position.lng]}
              icon={pinIcon}
              draggable={!readOnly}
              eventHandlers={readOnly ? undefined : handlers}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
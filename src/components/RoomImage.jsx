import { useState } from 'react';

export default function RoomImage({ src, alt, placeholder, className = 'room-photo' }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <div className={`${className} room-photo-empty`} role="img" aria-label={alt}>
        {placeholder}
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}

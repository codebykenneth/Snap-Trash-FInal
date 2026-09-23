// ============================================================
// SNAP TRASH — Leaflet map helpers
// ============================================================

const STATUS_COLORS = {
  waiting: '#f0b232', notified: '#f0b232', accepted: '#5865f2',
  ontheway: '#a970ff', cleaning: '#3bd6c6', completed: '#23a55a', rejected: '#f23f43',
};

export function statusColor(status) { return STATUS_COLORS[status] || '#949ba4'; }

function dotIcon(color, size = 26) {
  return window.L.divIcon({
    className: 'st-marker',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createMap(container, { center = [14.6500, 121.0500], zoom = 14 } = {}) {
  const map = window.L.map(container, { zoomControl: true, attributionControl: true }).setView(center, zoom);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  return map;
}

export function addStatusMarker(map, { lat, lng, status, popupHtml, onClick }) {
  const marker = window.L.marker([lat, lng], { icon: dotIcon(statusColor(status)) }).addTo(map);
  if (popupHtml) marker.bindPopup(popupHtml);
  if (onClick) marker.on('click', onClick);
  return marker;
}

export function addRadiusCircle(map, { lat, lng, radiusKm }) {
  return window.L.circle([lat, lng], {
    radius: radiusKm * 1000,
    color: '#23a55a',
    fillColor: '#23a55a',
    fillOpacity: 0.12,
    weight: 1.5,
  }).addTo(map);
}

// Try to get the user's current geolocation; falls back gracefully.
export function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 6000 }
    );
  });
}

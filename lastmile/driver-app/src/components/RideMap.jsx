import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createIcon = (emoji, size = 32) => L.divIcon({
  html: `<div style="font-size:${size}px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4))">${emoji}</div>`,
  className: 'custom-marker',
  iconSize: [size, size],
  iconAnchor: [size/2, size/2]
});

const rickshawIcon = createIcon('🛺', 36);
const pickupIcon = createIcon('📍', 32);
const dropoffIcon = createIcon('🏁', 32);

function AnimatedMarker({ path, duration = 15000, isActive }) {
  const [position, setPosition] = useState(path[0]);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isActive || path.length < 2) return;
    const stepTime = duration / path.length;
    const interval = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % path.length;
      setPosition(path[indexRef.current]);
    }, stepTime);
    return () => clearInterval(interval);
  }, [path, duration, isActive]);

  if (!position) return null;
  return <Marker position={position} icon={rickshawIcon}><Popup><strong>🛺 You are here</strong></Popup></Marker>;
}

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
}

function interpolatePoints(start, end, steps = 60) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push([
      start[0] + (end[0] - start[0]) * t + (Math.sin(t * Math.PI * 4) * 0.0003),
      start[1] + (end[1] - start[1]) * t + (Math.cos(t * Math.PI * 3) * 0.0004)
    ]);
  }
  return points;
}

const RideMap = ({ activeRide, isInProgress }) => {
  const pickupCoords = useMemo(() => {
    const pz = activeRide?.pickup_zone;
    return pz ? [pz.lat, pz.lng] : [19.0732, 72.8996];
  }, [activeRide]);

  const dropoffCoords = useMemo(() => {
    const dz = activeRide?.dropoff_zone;
    return dz ? [dz.lat, dz.lng] : [19.0798, 72.8964];
  }, [activeRide]);

  const routePath = useMemo(() => {
    return interpolatePoints(pickupCoords, dropoffCoords, 80);
  }, [pickupCoords, dropoffCoords]);

  return (
    <div className="w-full h-full rounded-3xl overflow-hidden border border-gray-700/50 shadow-2xl">
      <MapContainer
        center={pickupCoords}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />

        <FitBounds bounds={[pickupCoords, dropoffCoords]} />

        {/* Route line */}
        <Polyline positions={routePath} pathOptions={{ color: '#FF6B00', weight: 5, opacity: 0.3, lineCap: 'round' }} />
        <Polyline positions={routePath} pathOptions={{ color: '#FF6B00', weight: 3, opacity: 0.9, dashArray: '12 8', lineCap: 'round' }} />

        {/* Pickup */}
        <Marker position={pickupCoords} icon={pickupIcon}>
          <Popup><strong>📍 Pickup: {activeRide?.pickup_zone?.name}</strong></Popup>
        </Marker>

        {/* Dropoff */}
        <Marker position={dropoffCoords} icon={dropoffIcon}>
          <Popup><strong>🏁 Drop-off: {activeRide?.dropoff_zone?.name}</strong></Popup>
        </Marker>

        {/* Animated rickshaw during ride */}
        {isInProgress && (
          <AnimatedMarker path={routePath} duration={20000} isActive={true} />
        )}
      </MapContainer>
    </div>
  );
};

export default RideMap;

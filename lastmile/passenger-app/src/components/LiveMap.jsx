import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default icon issues in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom markers
const createCustomIcon = (emoji, size = 34, isPulse = false) => L.divIcon({
  html: `<div style="
    font-size:${size}px;
    filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4));
    transition: transform 0.3s ease;
    ${isPulse ? 'animation: pulse 1.5s infinite;' : ''}
  ">${emoji}</div>`,
  className: 'custom-leaflet-marker',
  iconSize: [size, size],
  iconAnchor: [size/2, size/2]
});

const rickshawLiveIcon = createCustomIcon('🛺', 40, true);
const pickupIcon = createCustomIcon('📍', 34);
const dropoffIcon = createCustomIcon('🏁', 34);
const driverIdleIcon = createCustomIcon('🛺', 30);

// Smooth animated marker that linearly interpolates (LERP) position between WebSocket telemetry ticks
function SmoothTelemetryMarker({ targetCoords, telemetryInfo }) {
  const [currentCoords, setCurrentCoords] = useState(targetCoords || [19.0732, 72.8996]);
  const prevCoordsRef = useRef(targetCoords);
  const animRef = useRef(null);
  const map = useMap();

  useEffect(() => {
    if (!targetCoords) return;
    
    const startLat = prevCoordsRef.current ? prevCoordsRef.current[0] : targetCoords[0];
    const startLng = prevCoordsRef.current ? prevCoordsRef.current[1] : targetCoords[1];
    const endLat = targetCoords[0];
    const endLng = targetCoords[1];

    const startTime = performance.now();
    const duration = 1800; // Interpolate smoothly over 1.8 seconds (matching 2s tick rate)

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Smooth ease-out quad interpolation
      const ease = 1 - (1 - progress) * (1 - progress);
      const curLat = startLat + (endLat - startLat) * ease;
      const curLng = startLng + (endLng - startLng) * ease;

      setCurrentCoords([curLat, curLng]);

      if (progress < 1.0) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        prevCoordsRef.current = targetCoords;
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetCoords]);

  // Smoothly pan map on new target telemetry updates (once per tick)
  useEffect(() => {
    if (targetCoords && map) {
      map.panTo(targetCoords, { animate: true, duration: 1.5 });
    }
  }, [targetCoords, map]);

  return (
    <Marker position={currentCoords} icon={rickshawLiveIcon}>
      <Popup autoPan={false}>
        <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '4px', minWidth: '180px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px' }}>🛺</span>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>
              {telemetryInfo?.driverName || 'Somaiya Rickshaw Express'}
            </strong>
          </div>
          
          <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '700', marginBottom: '2px' }}>
            ⚡ LIVE TELEMETRY STREAM
          </div>

          {telemetryInfo?.leg && (
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>
              📍 {telemetryInfo.leg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
            <span style={{ color: '#64748b' }}>Speed: <strong style={{ color: '#059669' }}>{telemetryInfo?.speedKmh || 24} km/h</strong></span>
            <span style={{ color: '#64748b' }}>Status: <strong style={{ color: '#2563eb' }}>En Route</strong></span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Component to fit bounds
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2 && bounds[0] && bounds[1]) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
}

// Fallback point interpolation between pickup & dropoff
function interpolatePoints(start, end, steps = 60) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push([
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t
    ]);
  }
  return points;
}

const LiveMap = ({ zones = [], drivers = [], userLocation, rideStatus, activeRide, telemetryData }) => {
  const defaultCenter = [19.0732, 72.8996]; // Somaiya Vidyavihar default center

  // Telemetry target position
  const liveCoords = useMemo(() => {
    if (telemetryData?.lat && telemetryData?.lng) {
      return [telemetryData.lat, telemetryData.lng];
    }
    return null;
  }, [telemetryData]);

  // Route paths when ride is active
  const pickupCoords = useMemo(() => {
    if (!activeRide) return null;
    const pickup = activeRide.pickup_zone || zones.find(z => z.id === activeRide.pickupZoneId);
    return pickup ? [pickup.lat, pickup.lng] : null;
  }, [activeRide, zones]);

  const dropoffCoords = useMemo(() => {
    if (!activeRide) return null;
    const dropoff = activeRide.dropoff_zone || zones.find(z => z.id === activeRide.dropoffZoneId);
    return dropoff ? [dropoff.lat, dropoff.lng] : null;
  }, [activeRide, zones]);

  const routePath = useMemo(() => {
    if (pickupCoords && dropoffCoords) {
      return interpolatePoints(pickupCoords, dropoffCoords, 50);
    }
    return [];
  }, [pickupCoords, dropoffCoords]);

  const isRideActive = rideStatus === 'IN_PROGRESS' || rideStatus === 'ACCEPTED' || Boolean(telemetryData);

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={liveCoords || userLocation || defaultCenter} 
        zoom={14} 
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
        />
        
        {/* Render all Somaiya Campus & Station Zones */}
        {zones.map((zone) => (
          <Marker key={zone.id} position={[zone.lat, zone.lng]}>
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif' }}>
                <strong style={{ fontSize: '13px', color: '#1e293b' }}>{zone.name}</strong><br />
                <span style={{ color: '#64748b', fontSize: '11px' }}>Category: {zone.zone_type}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Display idle drivers when not on an active ride */}
        {!isRideActive && drivers.map((driver) => (
          <Marker 
            key={driver.id} 
            position={[driver.current_lat || 19.0732, driver.current_lng || 72.8996]}
            icon={driverIdleIcon}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif' }}>
                <strong style={{ fontSize: '13px' }}>🛺 {driver.name}</strong><br />
                <span style={{ color: '#64748b', fontSize: '11px' }}>Rating: {driver.rating} ★</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Active route polyline */}
        {pickupCoords && dropoffCoords && (
          <>
            <FitBounds bounds={[pickupCoords, dropoffCoords]} />
            <Polyline 
              positions={routePath} 
              pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.3, lineCap: 'round' }} 
            />
            <Polyline 
              positions={routePath} 
              pathOptions={{ color: '#2563eb', weight: 3, opacity: 0.9, dashArray: '10 8', lineCap: 'round' }} 
            />
            <Marker position={pickupCoords} icon={pickupIcon}>
              <Popup><strong>📍 Pickup Zone</strong></Popup>
            </Marker>
            <Marker position={dropoffCoords} icon={dropoffIcon}>
              <Popup><strong>🏁 Drop-off Hub</strong></Popup>
            </Marker>
          </>
        )}

        {/* Smooth Telemetry Live Marker */}
        {liveCoords ? (
          <SmoothTelemetryMarker targetCoords={liveCoords} telemetryInfo={telemetryData} />
        ) : isRideActive && routePath.length > 0 && (
          <SmoothTelemetryMarker targetCoords={routePath[0]} telemetryInfo={{ driverName: 'Somaiya Campus Auto' }} />
        )}
      </MapContainer>
    </div>
  );
};

export default LiveMap;

import { io } from 'socket.io-client';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const DRIVER_ID = process.env.DRIVER_ID || 'mock-driver-somaiya';
const DRIVER_NAME = process.env.DRIVER_NAME || 'Ramesh Auto (Somaiya Express)';

console.log(`[Telemetry Simulator] Connecting to WebSocket server at ${BACKEND_URL}...`);

const socket = io(BACKEND_URL, {
  reconnection: true,
  reconnectionDelay: 1000
});

// Somaiya Campus Waypoints
const ROUTES = [
  {
    name: "Vidyavihar Station to KJSCE Campus",
    waypoints: [
      { lat: 19.0798, lng: 72.8964, label: "Vidyavihar Station East Exit" },
      { lat: 19.0775, lng: 72.8975, label: "Neelkanth Kingdom Road" },
      { lat: 19.0750, lng: 72.8985, label: "Somaiya Gate 2" },
      { lat: 19.0732, lng: 72.8996, label: "KJSCE Engineering Main Gate" },
      { lat: 19.0745, lng: 72.9010, label: "SIMSR Building" },
      { lat: 19.0720, lng: 72.8980, label: "Somaiya Hostels (Asha/Sandipani)" }
    ]
  },
  {
    name: "Sion Station to KJSIT & Hospital Campus",
    waypoints: [
      { lat: 19.0357, lng: 72.8688, label: "Sion Station East Exit" },
      { lat: 19.0410, lng: 72.8700, label: "Sion Circle Flyover" },
      { lat: 19.0463, lng: 72.8712, label: "KJSIT Engineering Gate" },
      { lat: 19.0482, lng: 72.8735, label: "KJ Somaiya Hospital Gate" },
      { lat: 19.0510, lng: 72.8765, label: "Chunnabhatti Railway Station" }
    ]
  }
];

// Linear interpolation to generate dense waypoints every 2 seconds
function generateInterpolatedRoute(waypoints, stepsPerSegment = 20) {
  const fullPath = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment;
      const lat = start.lat + (end.lat - start.lat) * t + (Math.sin(t * Math.PI) * 0.00008);
      const lng = start.lng + (end.lng - start.lng) * t + (Math.cos(t * Math.PI) * 0.00008);
      
      // Calculate bearing / heading
      const dy = end.lat - start.lat;
      const dx = end.lng - start.lng;
      const heading = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
      
      fullPath.push({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        heading: Number(heading.toFixed(1)),
        speedKmh: Math.floor(20 + Math.random() * 15),
        currentLeg: `${start.label} -> ${end.label}`
      });
    }
  }
  return fullPath;
}

let activeRouteIndex = 0;
let currentStep = 0;

socket.on('connect', () => {
  console.log(`[Telemetry Simulator] Connected to backend! Socket ID: ${socket.id}`);
  
  // Register driver role
  socket.emit('register', { role: 'Driver', id: DRIVER_ID });
  console.log(`[Telemetry Simulator] Registered as Driver: ${DRIVER_NAME} (${DRIVER_ID})`);

  startTelemetryStream();
});

socket.on('disconnect', () => {
  console.log('[Telemetry Simulator] Disconnected from WebSocket server.');
});

socket.on('connect_error', (err) => {
  console.error('[Telemetry Simulator] Connection error:', err.message);
});

function startTelemetryStream() {
  const currentRoute = ROUTES[activeRouteIndex];
  const densePath = generateInterpolatedRoute(currentRoute.waypoints, 25);
  
  console.log(`\n======================================================`);
  console.log(`🚀 STREAMING LIVE GPS TELEMETRY FOR: ${currentRoute.name}`);
  console.log(`📍 Total GPS Waypoints generated: ${densePath.length}`);
  console.log(`⏱️ Emission Interval: Every 2 seconds (0.5 Hz)`);
  console.log(`======================================================\n`);

  const interval = setInterval(() => {
    if (currentStep >= densePath.length) {
      currentStep = 0;
      activeRouteIndex = (activeRouteIndex + 1) % ROUTES.length;
      clearInterval(interval);
      console.log(`\n🔄 Route completed! Switching to next campus route...\n`);
      startTelemetryStream();
      return;
    }

    const point = densePath[currentStep];
    
    // Broadcast driver location update to socket server
    socket.emit('driver:location_update', {
      driverId: DRIVER_ID,
      driverName: DRIVER_NAME,
      lat: point.lat,
      lng: point.lng,
      heading: point.heading,
      speedKmh: point.speedKmh,
      leg: point.currentLeg,
      timestamp: new Date().toISOString()
    });

    console.log(`📡 [GPS TICK ${currentStep + 1}/${densePath.length}] Lat: ${point.lat}, Lng: ${point.lng} | ${point.speedKmh} km/h | ${point.currentLeg}`);

    currentStep++;
  }, 2000);
}

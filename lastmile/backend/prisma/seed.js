import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@somaiya.edu' },
    update: {},
    create: {
      email: 'admin@somaiya.edu',
      password: adminPassword,
      name: 'Admin'
    }
  });
  console.log("Created admin account (admin@somaiya.edu / admin123)");

  // Create Somaiya Vidyavihar & Sion Campus Zones & Transit Hubs
  const zones = [
    // Vidyavihar Campus
    { name: "KJSCE Main Gate (Engineering)", lat: 19.0732, lng: 72.8996, zone_type: "COLLEGE", is_active: true },
    { name: "Vidyavihar Station East Exit", lat: 19.0798, lng: 72.8964, zone_type: "STATION", is_active: true },
    { name: "Vidyavihar Station West Exit", lat: 19.0795, lng: 72.8955, zone_type: "STATION", is_active: true },
    { name: "Ghatkopar Station East (Metro/Local)", lat: 19.0860, lng: 72.9080, zone_type: "STATION", is_active: true },
    { name: "SIMSR (Management Building)", lat: 19.0745, lng: 72.9010, zone_type: "COLLEGE", is_active: true },
    { name: "Somaiya Hostels (Asha / Sandipani)", lat: 19.0720, lng: 72.8980, zone_type: "COLLEGE", is_active: true },
    { name: "Somaiya Athletics Sports Ground", lat: 19.0710, lng: 72.9005, zone_type: "COLLEGE", is_active: true },
    { name: "Tilak Nagar Station Exit", lat: 19.0665, lng: 72.8930, zone_type: "STATION", is_active: true },
    { name: "Ghatkopar Pant Nagar Junction", lat: 19.0815, lng: 72.9025, zone_type: "OFFICE", is_active: true },
    
    // Sion & Ayurvihar Campus
    { name: "KJ SOMAIYA INSTITUTE OF TECHNOLOGY MAIN GATE", lat: 19.0463, lng: 72.8712, zone_type: "COLLEGE", is_active: true },
    { name: "KJ SOMAIYA HOSPITAL MAIN GATE", lat: 19.0482, lng: 72.8735, zone_type: "COLLEGE", is_active: true },
    { name: "SION STATION", lat: 19.0357, lng: 72.8688, zone_type: "STATION", is_active: true },
    { name: "CHUNNABHATTI RAILWAY STATION", lat: 19.0510, lng: 72.8765, zone_type: "STATION", is_active: true },
  ];

  for (const z of zones) {
    await prisma.zone.create({ data: z });
  }

  console.log(`Created ${zones.length} zones.`);

  // Create Test Passenger with Somaiya email
  const passengerPassword = await bcrypt.hash('test123', 10);
  await prisma.user.upsert({
    where: { email: 'test@somaiya.edu' },
    update: {},
    create: { email: 'test@somaiya.edu', password: passengerPassword, name: 'Test User', phone: '9999999999' }
  });

  console.log("Created 1 test passenger (test@somaiya.edu / test123)");

  // Create 5 Drivers
  const drivers = [
    { phone: '8888888881', name: 'Ramesh Auto', vehicle_number: 'MH 01 AB 1111', is_verified: true, is_online: true, current_lat: 19.0735, current_lng: 72.8990, rating: 4.8, document_status: 'APPROVED' },
    { phone: '8888888882', name: 'Suresh Transport', vehicle_number: 'MH 02 BC 2222', is_verified: true, is_online: true, current_lat: 19.0790, current_lng: 72.8960, rating: 4.5, document_status: 'APPROVED' },
    { phone: '8888888883', name: 'Kishore Rickshaw', vehicle_number: 'MH 03 CD 3333', is_verified: true, is_online: false, current_lat: 19.0360, current_lng: 72.8680, rating: 4.2, document_status: 'APPROVED' },
    { phone: '8888888884', name: 'Mahesh Auto', vehicle_number: 'MH 04 DE 4444', is_verified: true, is_online: true, current_lat: 19.0655, current_lng: 72.8790, rating: 5.0, document_status: 'APPROVED' },
    { phone: '8888888885', name: 'Ganesh Rides', vehicle_number: 'MH 05 EF 5555', is_verified: false, is_online: false, current_lat: 19.0860, current_lng: 72.8890, rating: 3.9, document_status: 'PENDING' },
  ];

  for (const d of drivers) {
    await prisma.driver.upsert({
      where: { phone: d.phone },
      update: {},
      create: d
    });
  }

  console.log(`Created ${drivers.length} drivers.`);
  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

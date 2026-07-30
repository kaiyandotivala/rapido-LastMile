import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting active/stuck ride cleanup...");
  
  const updatedRides = await prisma.ride.updateMany({
    where: {
      status: {
        in: ['SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS']
      }
    },
    data: {
      status: 'CANCELLED',
      cancelled_at: new Date(),
      cancel_reason: 'Automated database cleanup reset'
    }
  });

  console.log(`Successfully cancelled ${updatedRides.count} active/stuck ride(s).`);
}

main()
  .catch((e) => {
    console.error("Error cleaning up rides:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

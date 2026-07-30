import { setDriverLocation, clearDriverLocation } from '../utils/redis.js';
import logger from '../utils/logger.js';
import prisma from '../utils/prisma.js';

export const initSocket = (io) => {
  io.on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);

    // Store their role & ID manually upon connect message
    socket.on('register', async ({ role, id }) => {
        socket.userRole = role; // 'Driver' or 'Passenger'
        socket.userId = id;
        socket.join(`${role}:${id}`); // e.g. "Driver:123"
        logger.info(`${role} registered with ID ${id}`);
        
        // If driver, set online via socket connect optionally
        if (role === 'Driver') {
            await prisma.driver.update({ where: { id }, data: { is_online: true } });
        }
    });

    socket.on('driver:location_update', async (data) => {
      const driverId = data.driverId || socket.userId;
      const { lat, lng, heading, speedKmh, leg } = data;

      if (driverId) {
        try {
          await setDriverLocation(driverId, lat, lng);
        } catch (e) {
          // Ignore redis failure in local fallback mode
        }

        const payload = { driverId, lat, lng, heading, speedKmh, leg, timestamp: new Date().toISOString() };
        
        // Broadcast to specific ride room & global live tracking map
        io.to(`tracking_${driverId}`).emit('ride:driver_location', payload);
        io.emit('ride:driver_location', payload);
      }
    });

    socket.on('passenger:track_driver', ({ driverId }) => {
        // Passengers request to track a specific driver once matched
        socket.join(`tracking_${driverId}`);
    });

    socket.on('disconnect', async () => {
      logger.info(`Client disconnected: ${socket.id}`);
      if (socket.userRole === 'Driver' && socket.userId) {
          // Clean up
          await clearDriverLocation(socket.userId);
          await prisma.driver.update({ where: { id: socket.userId }, data: { is_online: false } });
      }
    });
  });
};

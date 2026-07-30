import express from 'express';
import prisma from '../utils/prisma.js';
import { io } from '../../server.js';

const router = express.Router();

// Dev route to wipe/cancel all active stuck rides
router.post('/reset-rides', async (req, res, next) => {
  try {
    const updated = await prisma.ride.updateMany({
      where: {
        status: {
          in: ['SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS']
        }
      },
      data: {
        status: 'CANCELLED',
        cancelled_at: new Date(),
        cancel_reason: 'Dev environment reset'
      }
    });

    // Notify all connected clients over WebSocket
    if (io) {
      io.emit('ride_cancelled', { reset: true });
      io.emit('ride:request_cancelled', { reset: true });
    }

    res.status(200).json({
      success: true,
      message: `Reset complete. ${updated.count} active ride(s) set to CANCELLED.`,
      cancelledCount: updated.count
    });
  } catch (error) {
    next(error);
  }
});

export default router;

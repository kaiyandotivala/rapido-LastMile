import prisma from '../utils/prisma.js';
import { io } from '../../server.js';
import { FareCalculator } from '../services/FareCalculator.js';

export const requestRide = async (req, res, next) => {
  try {
    const { pickupZoneId, dropoffZoneId, meterEstimate } = req.body;

    const passengerId = req.user.id;

    const { convenienceFee, peakSurcharge, totalEstimated } = FareCalculator.calculateEstimatedFare(meterEstimate);

    // Create a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const ride = await prisma.ride.create({
      data: {
        passengerId,
        pickupZoneId,
        dropoffZoneId,
        convenience_fee: convenienceFee,
        peak_hour_surcharge: peakSurcharge,
        total_fare: totalEstimated,
        otp
      },
      include: {
        pickup_zone: true,
        dropoff_zone: true,
        passenger: { select: { name: true, phone: true } }
      }
    });

    // Fire Socket event for Driver Matches
    io.emit('ride:new_request', { ride });

    res.status(201).json({ success: true, data: ride });
  } catch (error) {
    next(error);
  }
};

export const cancelRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancel_reason } = req.body;

    // First fetch the ride so we know which driver/passenger to notify
    const existingRide = await prisma.ride.findUnique({ where: { id } });

    const ride = await prisma.ride.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelled_at: new Date(),
        cancel_reason: cancel_reason || 'Cancelled by user'
      }
    });

    // Notify all parties — targeted events to passenger and driver
    io.emit('ride:request_cancelled', { ride_id: id });
    io.emit('ride_cancelled', { ride_id: id });
    if (existingRide?.driverId) {
      io.emit(`ride:request_cancelled_${existingRide.driverId}`, { ride_id: id });
      io.emit(`ride_cancelled_${existingRide.driverId}`, { ride_id: id });
    }
    if (existingRide?.passengerId) {
      io.emit(`ride:request_cancelled_${existingRide.passengerId}`, { ride_id: id });
      io.emit(`ride_cancelled_${existingRide.passengerId}`, { ride_id: id });
    }

    res.status(200).json({ success: true, data: ride });
  } catch (error) {
    next(error);
  }
};

export const rateDriver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stars, comment } = req.body;

    const ride = await prisma.ride.findUnique({ where: { id } });

    if (!ride || ride.status !== 'COMPLETED') {
        throw new Error("Cannot rate a non-completed ride");
    }

    const rating = await prisma.rating.create({
        data: {
            rideId: id,
            rated_by: 'PASSENGER',
            rated_to_id: ride.driverId,
            stars,
            comment
        }
    });

    res.status(201).json({ success: true, data: rating });
  } catch (error) {
    next(error);
  }
};

export const acceptRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const driverId = req.user.id;

    // Concurrency / transaction safe update
    const ride = await prisma.ride.updateMany({
        where: { id, status: 'SEARCHING' },
        data: {
            driverId,
            status: 'ACCEPTED',
            accepted_at: new Date()
        }
    });

    if (ride.count === 0) {
        res.status(400);
        throw new Error('Ride already accepted or cancelled');
    }

    const updatedRide = await prisma.ride.findUnique({
        where: { id },
        include: { driver: true }
    });

    // Notify passenger
    io.emit(`ride:driver_found_${updatedRide.passengerId}`, { 
        driver: updatedRide.driver, 
        eta: "3 mins", 
        location: { lat: updatedRide.driver.current_lat, lng: updatedRide.driver.current_lng } 
    });

    res.status(200).json({ success: true, data: updatedRide });
  } catch (error) {
    next(error);
  }
};

export const verifyPassengerOtp = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { otp } = req.body;

        const ride = await prisma.ride.findUnique({ where: { id } });

        if (!ride || ride.otp !== otp) {
            res.status(400);
            throw new Error('Invalid OTP');
        }

        const updatedRide = await prisma.ride.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
                pickup_at: new Date()
            }
        });

        // Notify passenger
        io.emit(`ride:status_update_${updatedRide.passengerId}`, { status: 'IN_PROGRESS' });

        res.status(200).json({ success: true, data: updatedRide });
    } catch(err) {
        next(err);
    }
}

export const completeRide = async (req, res, next) => {
    try {
        const { id } = req.params;

        const ride = await prisma.ride.findUnique({ where: { id } });

        if (!ride || ride.status !== 'IN_PROGRESS') {
            res.status(400);
            throw new Error('Ride not in progress');
        }

        const finalFareAmount = ride.total_fare;
        const driverPayout = finalFareAmount - ride.convenience_fee - ride.peak_hour_surcharge;
        const baseFareAmount = driverPayout;

        const updatedRide = await prisma.ride.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                dropoff_at: new Date(),
                meter_fare: baseFareAmount,
                wait_time_penalty: 0,
                payment_status: 'PENDING'
            }
        });

        const fareDetails = {
            rideId: id,
            totalFare: finalFareAmount,
            baseFare: baseFareAmount,
            convenienceFee: ride.convenience_fee,
            peakSurcharge: ride.peak_hour_surcharge,
            waitPenalty: 0,
            driverPayout: driverPayout
        };

        // Notify passenger that ride is complete and payment is needed
        io.emit(`ride:completed_${updatedRide.passengerId}`, { fare_breakdown: fareDetails, rideId: id });

        res.status(200).json({ success: true, data: updatedRide, fare: fareDetails });
    } catch(err) {
        next(err);
    }
}

// Get Active Session for State Persistence / Rehydration on Tab Refresh
export const getActiveSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let activeRide = null;

    if (userRole === 'Passenger') {
      // Only return rides that are genuinely active — never CANCELLED or COMPLETED(PAID)
      activeRide = await prisma.ride.findFirst({
        where: {
          passengerId: userId,
          OR: [
            { status: { in: ['SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS'] } },
            { status: 'COMPLETED', payment_status: 'PENDING' }
          ]
        },
        include: {
          pickup_zone: true,
          dropoff_zone: true,
          driver: true,
          passenger: { select: { id: true, name: true, phone: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Extra safety: if status is CANCELLED or COMPLETED with PAID, return null
      if (activeRide && (activeRide.status === 'CANCELLED' || (activeRide.status === 'COMPLETED' && activeRide.payment_status === 'PAID'))) {
        activeRide = null;
      }
    } else if (userRole === 'Driver') {
      // Driver must be explicitly assigned (driverId match) and ride must be actively in progress or payment pending
      activeRide = await prisma.ride.findFirst({
        where: {
          driverId: userId, // Strict: only rides where THIS driver is assigned
          OR: [
            { status: { in: ['ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS'] } },
            { status: 'COMPLETED', payment_status: 'PENDING' }
          ]
        },
        include: {
          pickup_zone: true,
          dropoff_zone: true,
          passenger: { select: { id: true, name: true, phone: true } },
          driver: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Extra safety for Driver: if driverId does not match or status is SEARCHING/CANCELLED/COMPLETED(PAID)
      if (activeRide) {
        if (
          activeRide.driverId !== userId ||
          activeRide.status === 'CANCELLED' ||
          activeRide.status === 'SEARCHING' ||
          (activeRide.status === 'COMPLETED' && activeRide.payment_status === 'PAID')
        ) {
          activeRide = null;
        }
      }
    }

    if (!activeRide) {
      return res.status(200).json({ success: true, data: null });
    }

    // Mask phone number for privacy
    const result = { ...activeRide };
    if (result.passenger?.phone) {
      const p = result.passenger.phone;
      result.passenger = { ...result.passenger, maskedPhone: p.length > 5 ? p.substring(0, 3) + '****' + p.substring(p.length - 2) : '****' };
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Passenger confirms payment completion - marks ride PAID instantly and notifies driver & passenger
export const confirmPayment = async (req, res, next) => {
    try {
        const { id } = req.params;

        const ride = await prisma.ride.findUnique({ where: { id } });

        if (!ride || ride.status !== 'COMPLETED') {
            res.status(400);
            throw new Error('Ride is not completed yet');
        }

        const updatedRide = await prisma.ride.update({
            where: { id },
            data: { payment_status: 'PAID' }
        });

        // Notify BOTH driver and passenger that payment is confirmed
        if (ride.driverId) {
            io.emit(`ride:payment_confirmed_${ride.driverId}`, { rideId: id });
        }
        io.emit(`ride:payment_confirmed_${ride.passengerId}`, { rideId: id });

        res.status(200).json({ success: true, message: 'Payment confirmed successfully', data: updatedRide });
    } catch (err) {
        next(err);
    }
};

// Driver verifies payment manually if needed (fallback)
export const verifyPaymentOtp = async (req, res, next) => {
    try {
        const { id } = req.params;

        const ride = await prisma.ride.findUnique({ where: { id } });

        if (!ride || ride.status !== 'COMPLETED') {
            res.status(400);
            throw new Error('Invalid ride');
        }

        const updatedRide = await prisma.ride.update({
            where: { id },
            data: { payment_status: 'PAID' }
        });

        // Notify passenger that payment is confirmed
        io.emit(`ride:payment_confirmed_${ride.passengerId}`, { rideId: id });
        if (ride.driverId) {
            io.emit(`ride:payment_confirmed_${ride.driverId}`, { rideId: id });
        }

        res.status(200).json({ success: true, message: 'Payment verified successfully', data: updatedRide });
    } catch (err) {
        next(err);
    }
};


import prisma from '../utils/prisma.js';

// ─── Dashboard Stats ────────────────────────────────────────────

export const getDashboardStats = async (req, res, next) => {
  try {
    const [totalRides, completedRides, cancelledRides, totalDrivers, pendingDrivers, activeDrivers, totalPassengers] = await Promise.all([
      prisma.ride.count({ where: { status: { not: 'SEARCHING' } } }),
      prisma.ride.count({ where: { status: 'COMPLETED' } }),
      prisma.ride.count({ where: { status: 'CANCELLED' } }),
      prisma.driver.count(),
      prisma.driver.count({ where: { document_status: 'PENDING' } }),
      prisma.driver.count({ where: { is_online: true } }),
      prisma.user.count()
    ]);

    const completedRidesData = await prisma.ride.findMany({
      where: { status: 'COMPLETED' },
      select: { total_fare: true, convenience_fee: true, peak_hour_surcharge: true }
    });

    const totalRevenue = completedRidesData.reduce((sum, r) => sum + (r.total_fare || 0), 0);
    const platformEarnings = completedRidesData.reduce((sum, r) => sum + (r.convenience_fee || 0) + (r.peak_hour_surcharge || 0), 0);

    const recentRides = await prisma.ride.findMany({
      take: 10,
      where: { status: { not: 'SEARCHING' } },
      orderBy: { createdAt: 'desc' },
      include: {
        passenger: { select: { name: true, email: true } },
        driver: { select: { name: true, phone: true, vehicle_number: true } },
        pickup_zone: { select: { name: true } },
        dropoff_zone: { select: { name: true } }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalRides,
          completedRides,
          cancelledRides,
          totalDrivers,
          pendingDrivers,
          activeDrivers,
          totalPassengers,
          totalRevenue: Math.round(totalRevenue),
          platformEarnings: Math.round(platformEarnings)
        },
        recentRides
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── All Rides ──────────────────────────────────────────────────

export const getAllRides = async (req, res, next) => {
  try {
    const rides = await prisma.ride.findMany({
      where: { status: { not: 'SEARCHING' } },
      orderBy: { createdAt: 'desc' },
      include: {
        passenger: { select: { name: true, email: true } },
        driver: { select: { name: true, phone: true, vehicle_number: true, rating: true } },
        pickup_zone: { select: { name: true } },
        dropoff_zone: { select: { name: true } }
      }
    });

    res.status(200).json({ success: true, count: rides.length, data: rides });
  } catch (error) {
    next(error);
  }
};

// ─── All Drivers ────────────────────────────────────────────────

export const getAllDrivers = async (req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { rides: true } }
      }
    });

    // Calculate earnings for each driver
    const driversWithEarnings = await Promise.all(
      drivers.map(async (driver) => {
        const rides = await prisma.ride.findMany({
          where: { driverId: driver.id, status: 'COMPLETED' },
          select: { total_fare: true }
        });
        const totalEarnings = rides.reduce((sum, r) => sum + (r.total_fare || 0), 0);
        return { ...driver, totalEarnings: Math.round(totalEarnings), completedRides: rides.length };
      })
    );

    res.status(200).json({ success: true, count: driversWithEarnings.length, data: driversWithEarnings });
  } catch (error) {
    next(error);
  }
};

// ─── Pending Drivers ────────────────────────────────────────────

export const getPendingDrivers = async (req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({
      where: { document_status: 'PENDING', driving_license: { not: null } },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, count: drivers.length, data: drivers });
  } catch (error) {
    next(error);
  }
};

// ─── Driver Detail ──────────────────────────────────────────────

export const getDriverDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        rides: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            passenger: { select: { name: true } },
            pickup_zone: { select: { name: true } },
            dropoff_zone: { select: { name: true } }
          }
        },
        _count: { select: { rides: true } }
      }
    });

    if (!driver) {
      res.status(404);
      throw new Error('Driver not found');
    }

    const completedRides = await prisma.ride.findMany({
      where: { driverId: id, status: 'COMPLETED' },
      select: { total_fare: true, convenience_fee: true }
    });
    const totalEarnings = completedRides.reduce((sum, r) => sum + (r.total_fare || 0), 0);
    const platformFees = completedRides.reduce((sum, r) => sum + (r.convenience_fee || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        ...driver,
        totalEarnings: Math.round(totalEarnings),
        platformFees: Math.round(platformFees),
        completedRidesCount: completedRides.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Approve Driver ─────────────────────────────────────────────

export const approveDriver = async (req, res, next) => {
  try {
    const { id } = req.params;

    const driver = await prisma.driver.update({
      where: { id },
      data: {
        document_status: 'APPROVED',
        is_verified: true,
        rejection_reason: null
      }
    });

    res.status(200).json({ success: true, message: 'Driver approved successfully', data: driver });
  } catch (error) {
    next(error);
  }
};

// ─── Reject Driver ──────────────────────────────────────────────

export const rejectDriver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const driver = await prisma.driver.update({
      where: { id },
      data: {
        document_status: 'REJECTED',
        is_verified: false,
        rejection_reason: reason || 'Documents did not meet verification requirements'
      }
    });

    res.status(200).json({ success: true, message: 'Driver rejected', data: driver });
  } catch (error) {
    next(error);
  }
};

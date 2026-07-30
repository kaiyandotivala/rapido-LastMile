import prisma from '../utils/prisma.js';

export const getProfile = async (req, res, next) => {
  try {
    const passenger = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { _count: { select: { rides: true } } }
    });
    res.status(200).json({ success: true, data: passenger });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, profile_pic } = req.body;
    const passenger = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email, profile_pic }
    });
    res.status(200).json({ success: true, data: passenger });
  } catch (error) {
    next(error);
  }
};

export const getRides = async (req, res, next) => {
  try {
    const rides = await prisma.ride.findMany({
      where: { passengerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        driver: { select: { name: true, phone: true, vehicle_number: true, rating: true, profile_pic: true } },
        pickup_zone: true,
        dropoff_zone: true,
      }
    });
    res.status(200).json({ success: true, count: rides.length, data: rides });
  } catch (error) {
    next(error);
  }
};

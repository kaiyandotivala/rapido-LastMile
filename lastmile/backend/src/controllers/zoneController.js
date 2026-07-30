import prisma from '../utils/prisma.js';

export const getZones = async (req, res, next) => {
  try {
    const zones = await prisma.zone.findMany({
      where: { is_active: true }
    });
    res.status(200).json({ success: true, count: zones.length, data: zones });
  } catch (error) {
    next(error);
  }
};

export const getDriversNearZone = async (req, res, next) => {
  try {
    const { id } = req.params;
    // For MVP, just return all online verified drivers since we don't have geo-queries setup yet
    // A proper extension would use PostGIS or Haversine formula
    const drivers = await prisma.driver.findMany({
      where: { is_online: true, is_verified: true },
      select: { id: true, name: true, vehicle_number: true, rating: true, current_lat: true, current_lng: true }
    });
    res.status(200).json({ success: true, count: drivers.length, data: drivers });
  } catch (error) {
    next(error);
  }
};

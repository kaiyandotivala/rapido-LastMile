import prisma from '../utils/prisma.js';

export const getProfile = async (req, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.user.id },
      include: { subscriptions: true }
    });
    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, profile_pic, vehicle_number } = req.body;
    const driver = await prisma.driver.update({
      where: { id: req.user.id },
      data: { name, profile_pic, vehicle_number }
    });
    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { is_online } = req.body;
    const driver = await prisma.driver.update({
      where: { id: req.user.id },
      data: { is_online }
    });
    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    const driver = await prisma.driver.update({
      where: { id: req.user.id },
      data: { current_lat: lat, current_lng: lng }
    });
    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    next(error);
  }
};

export const getEarnings = async (req, res, next) => {
  try {
    const rides = await prisma.ride.findMany({
      where: { driverId: req.user.id, status: 'COMPLETED' },
      include: { transactions: true }
    });
    const totalEarnings = rides.reduce((sum, r) => sum + (r.total_fare || 0), 0);
    res.status(200).json({ success: true, count: rides.length, data: { totalEarnings, rides } });
  } catch (error) {
    next(error);
  }
};

export const subscribe = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const sub = await prisma.driverSubscription.create({
      data: {
        driverId: req.user.id,
        plan,
        endDate
      }
    });
    res.status(201).json({ success: true, data: sub });
  } catch (error) {
    next(error);
  }
};

// ─── Document Upload ────────────────────────────────────────────

export const uploadDocuments = async (req, res, next) => {
  try {
    const { driving_license, fitness_certificate, aadhar_card } = req.body;

    if (!driving_license || !fitness_certificate || !aadhar_card) {
      res.status(400);
      throw new Error('All three documents are required: driving_license, fitness_certificate, aadhar_card');
    }

    const driver = await prisma.driver.update({
      where: { id: req.user.id },
      data: {
        driving_license,
        fitness_certificate,
        aadhar_card,
        document_status: 'PENDING',
        rejection_reason: null
      }
    });

    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully. Awaiting admin verification.',
      data: { document_status: driver.document_status }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Check Document Status ──────────────────────────────────────

export const getDocumentStatus = async (req, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.user.id },
      select: { document_status: true, rejection_reason: true, is_verified: true }
    });

    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    next(error);
  }
};

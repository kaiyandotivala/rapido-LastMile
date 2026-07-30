import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getDashboardStats,
  getAllRides,
  getAllDrivers,
  getPendingDrivers,
  getDriverDetails,
  approveDriver,
  rejectDriver
} from '../controllers/adminController.js';

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get('/dashboard', getDashboardStats);
router.get('/rides', getAllRides);
router.get('/drivers', getAllDrivers);
router.get('/drivers/pending', getPendingDrivers);
router.get('/drivers/:id', getDriverDetails);
router.post('/drivers/:id/approve', approveDriver);
router.post('/drivers/:id/reject', rejectDriver);

export default router;

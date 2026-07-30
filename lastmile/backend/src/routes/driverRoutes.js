import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getProfile, updateProfile, toggleStatus,
  updateLocation, getEarnings, subscribe,
  uploadDocuments, getDocumentStatus
} from '../controllers/driverController.js';

const router = express.Router();

router.use(protect); // All driver routes protected

router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

router.patch('/status', toggleStatus);
router.patch('/location', updateLocation);

router.get('/earnings', getEarnings);
router.post('/subscribe', subscribe);

// Document management
router.post('/documents', uploadDocuments);
router.get('/documents/status', getDocumentStatus);

export default router;

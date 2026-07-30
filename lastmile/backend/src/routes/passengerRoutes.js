import express from 'express';
import { getProfile, updateProfile, getRides } from '../controllers/passengerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All passenger routes protected

router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

router.get('/rides', getRides);

export default router;

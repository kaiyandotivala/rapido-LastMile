import express from 'express';
import { protect } from '../middleware/auth.js';
import { getActiveSession, requestRide, cancelRide, rateDriver, acceptRide, verifyPassengerOtp, completeRide, confirmPayment, verifyPaymentOtp } from '../controllers/rideController.js';

const router = express.Router();

router.use(protect); // Ensure all are logged in

// Active Session Rehydration
router.get('/active-session', getActiveSession);

// Passenger Actions
router.post('/request', requestRide);
router.delete('/:id/cancel', cancelRide);
router.patch('/:id/cancel', cancelRide);
router.post('/:id/rate', rateDriver);
router.post('/:id/confirm-payment', confirmPayment);

// Driver Actions
router.post('/:id/accept', acceptRide);
router.post('/:id/verify-otp', verifyPassengerOtp);
router.post('/:id/complete', completeRide);
router.post('/:id/verify-payment', verifyPaymentOtp);

export default router;

import express from 'express';
import { sendOtp, verifyOtp, refreshToken, passengerRegister, passengerLogin, adminLogin } from '../controllers/authController.js';

const router = express.Router();

// Passenger email auth
router.post('/passenger/register', passengerRegister);
router.post('/passenger/login', passengerLogin);

// Admin auth
router.post('/admin/login', adminLogin);

// Driver OTP auth
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Token refresh
router.post('/refresh', refreshToken);

export default router;

import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcrypt';
import { generateTokens, verifyToken } from '../utils/token.js';

// In-memory store for OTPs for MVP 
const otpStore = new Map();

// ─── Passenger Email Auth ───────────────────────────────────────

export const passengerRegister = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400);
      throw new Error('Email, password, and name are required');
    }

    // Validate @somaiya.edu domain
    if (!email.endsWith('@somaiya.edu')) {
      res.status(400);
      throw new Error('Only @somaiya.edu email addresses are allowed');
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400);
      throw new Error('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name }
    });

    const { accessToken, refreshToken } = generateTokens(user.id, 'Passenger');

    res.status(201).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

export const passengerLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Email and password are required');
    }

    if (!email.endsWith('@somaiya.edu')) {
      res.status(400);
      throw new Error('Only @somaiya.edu email addresses are allowed');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    const { accessToken, refreshToken } = generateTokens(user.id, 'Passenger');

    res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin Auth ─────────────────────────────────────────────────

export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Email and password are required');
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    const { accessToken, refreshToken } = generateTokens(admin.id, 'Admin');

    res.status(200).json({
      success: true,
      user: { id: admin.id, email: admin.email, name: admin.name },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// ─── Driver OTP Auth (kept as-is) ──────────────────────────────

export const sendOtp = async (req, res, next) => {
  try {
    const { phone, role } = req.body;
    
    if (!phone || !role) {
      res.status(400);
      throw new Error('Phone number and role (Driver) are required');
    }

    // Hardcoded 6-digit mock OTP for MVP local testing
    const otp = "123456";
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
    
    otpStore.set(phone, { otp, expiresAt });

    logger.info(`[MOCK SMS] OTP for ${role} ${phone}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully (check server logs for MVP)'
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp, role, name, vehicle_number } = req.body;

    if (!phone || !otp || !role) {
      res.status(400);
      throw new Error('Phone, OTP, and role are required');
    }

    const record = otpStore.get(phone);

    if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
      res.status(401);
      throw new Error('Invalid or expired OTP');
    }

    // OTP fits, clear it from memory
    otpStore.delete(phone);

    let user;
    if (role === 'Driver') {
      // Check if driver already exists
      const existingDriver = await prisma.driver.findUnique({ where: { phone } });
      
      if (existingDriver) {
        // Existing driver - check document status
        user = existingDriver;
        
        if (existingDriver.document_status === 'PENDING' && !existingDriver.is_verified) {
          // Driver exists but documents not yet approved
          const { accessToken, refreshToken } = generateTokens(user.id, 'Driver');
          return res.status(200).json({
            success: true,
            user,
            accessToken,
            refreshToken,
            requiresDocuments: !existingDriver.driving_license,
            pendingVerification: existingDriver.driving_license ? true : false
          });
        }
        
        if (existingDriver.document_status === 'REJECTED') {
          const { accessToken, refreshToken } = generateTokens(user.id, 'Driver');
          return res.status(200).json({
            success: true,
            user,
            accessToken,
            refreshToken,
            documentRejected: true,
            rejectionReason: existingDriver.rejection_reason
          });
        }
      } else {
        // New driver
        user = await prisma.driver.create({
          data: { phone, name: name || 'New Driver', vehicle_number, document_status: 'PENDING' }
        });
        
        const { accessToken, refreshToken } = generateTokens(user.id, 'Driver');
        return res.status(200).json({
          success: true,
          user,
          accessToken,
          refreshToken,
          requiresDocuments: true
        });
      }
    } else {
      res.status(400);
      throw new Error('Use email login for passengers');
    }

    const { accessToken, refreshToken } = generateTokens(user.id, 'Driver');

    res.status(200).json({
      success: true,
      user,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(401);
      throw new Error('Refresh token is required');
    }

    const decoded = verifyToken(token);
    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.id, decoded.role);

    res.status(200).json({
      accessToken,
      refreshToken: newRefresh
    });
  } catch (error) {
    res.status(401);
    next(new Error('Invalid refresh token'));
  }
};

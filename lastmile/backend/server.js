import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import logger from './src/utils/logger.js';
import authRoutes from './src/routes/authRoutes.js';
import passengerRoutes from './src/routes/passengerRoutes.js';
import driverRoutes from './src/routes/driverRoutes.js';
import zoneRoutes from './src/routes/zoneRoutes.js';
import rideRoutes from './src/routes/rideRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import devRoutes from './src/routes/devRoutes.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { rateLimiter } from './src/middleware/rateLimiter.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

import { initSocket } from './src/socket/socketHandler.js';
initSocket(io);

app.use(cors());
app.use(express.json({ limit: '20mb' })); // Increased for Base64 document uploads
app.use(morgan('dev'));

// Rate Limiting
const authLimiter = rateLimiter({ windowMs: 60 * 1000, max: 15 });

// Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/passenger', passengerRoutes);
app.use('/api/v1/driver', driverRoutes);
app.use('/api/v1/zones', zoneRoutes);
app.use('/api/v1/rides', rideRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/dev', devRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

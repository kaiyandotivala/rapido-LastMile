import { createClient } from 'redis';
import logger from './logger.js';

// Fallback Memory map if Docker/Redis is not running
const fallbackMemoryStore = new Map();
let isRedisConnected = false;

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  logger.warn('Redis Client Error: Falling back to Memory Store', err.message);
  isRedisConnected = false;
});

redisClient.on('connect', () => {
    logger.info('Connected to Redis');
    isRedisConnected = true;
});

// We connect silently and catch without crashing because of the Docker situation
redisClient.connect().catch(() => {});

export const setDriverLocation = async (driverId, lat, lng) => {
    const data = JSON.stringify({ lat, lng, last_updated: Date.now() });
    if (isRedisConnected) {
        await redisClient.hSet('driver_locations', driverId, data);
    } else {
        fallbackMemoryStore.set(`driver_locations:${driverId}`, data);
    }
};

export const getDriverLocation = async (driverId) => {
    if (isRedisConnected) {
        const data = await redisClient.hGet('driver_locations', driverId);
        return data ? JSON.parse(data) : null;
    } else {
        const data = fallbackMemoryStore.get(`driver_locations:${driverId}`);
        return data ? JSON.parse(data) : null;
    }
};

export const clearDriverLocation = async (driverId) => {
    if (isRedisConnected) {
        await redisClient.hDel('driver_locations', driverId);
    } else {
        fallbackMemoryStore.delete(`driver_locations:${driverId}`);
    }
};

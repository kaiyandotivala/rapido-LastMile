import express from 'express';
import { getZones, getDriversNearZone } from '../controllers/zoneController.js';

const router = express.Router();

router.get('/', getZones);
router.get('/:id/drivers', getDriversNearZone);

export default router;

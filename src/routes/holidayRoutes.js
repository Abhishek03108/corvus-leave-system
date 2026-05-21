import express from 'express';
import * as holidayController from '../controllers/holidayController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', holidayController.getAllHolidays);
router.get('/upcoming', holidayController.getUpcomingHolidays);

// Admin-only configs
router.post('/rule', restrictTo('admin'), holidayController.createHolidayRule);

export default router;

import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/monthly', analyticsController.getMonthlyLeaveAnalytics);
router.get('/stats', analyticsController.getDashboardStats);

export default router;

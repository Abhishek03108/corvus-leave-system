import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are admin-restricted
router.use(protect, restrictTo('admin'));

router.post('/employee', adminController.createEmployee);
router.patch('/employee/:id', adminController.updateEmployee);
router.get('/audit-logs', adminController.getAuditLogs);
router.post('/balance-override', adminController.overrideLeaveBalance);

export default router;

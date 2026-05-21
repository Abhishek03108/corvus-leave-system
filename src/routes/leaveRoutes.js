import express from 'express';
import * as leaveController from '../controllers/leaveController.js';
import * as leaveValidator from '../validators/leaveValidator.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/apply', leaveValidator.validateApplyLeave, leaveController.applyLeave);
router.get('/balances', leaveController.getPersonalBalances);
router.get('/personal-requests', leaveController.getPersonalRequests);
router.patch('/:id/medical-document', leaveValidator.validateMedicalDocument, leaveController.updateMedicalDocument);

// Manager/Admin workflows
router.get('/team-requests', restrictTo('manager', 'admin', 'senior_manager'), leaveController.getTeamRequests);
router.patch('/:id/status', restrictTo('manager', 'admin', 'senior_manager'), leaveValidator.validateUpdateStatus, leaveController.updateStatus);

export default router;

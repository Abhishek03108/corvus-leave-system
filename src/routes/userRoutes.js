import express from 'express';
import * as userController from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/profile', userController.getUserProfile);
router.patch('/profile', userController.updateProfile);
router.get('/list', userController.getEmployeeList);

export default router;

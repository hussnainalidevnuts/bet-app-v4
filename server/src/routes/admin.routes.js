import express from 'express';
import AdminController from '../controllers/admin.controller.js';
import { authenticateToken } from '../middlewares/auth.js';
import leaguesRouter from './admin/leagues.js';

const router = express.Router();
const adminController = new AdminController();

// Admin leagues routes (without auth for now)
router.use('/leagues', leaguesRouter);

// Apply authentication middleware to other admin routes
router.use(authenticateToken);

// Update bet status
router.put('/bets/:betId/status', adminController.updateBetStatus.bind(adminController));

export default router;

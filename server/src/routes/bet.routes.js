import express from "express";
import BetController from "../controllers/bet.controller.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

//INFO: Get all bets of the authenticated user
router.get("/", authenticateToken, BetController.getUserBets);

//INFO: Place a new bet
router.post("/place-bet", authenticateToken, BetController.placeBet);

//INFO: Check outcome of a specific bet
router.get("/:betId/outcome", authenticateToken, BetController.checkBetOutcome);

//INFO: Check outcomes of all pending bets (e.g., for scheduled job)
router.get("/pending/check", authenticateToken, BetController.checkPendingBets);

//WARNING: This route is for admin use only, to get all bets
router.get("/admin/all", authenticateToken, BetController.getAllBets);

export default router;

import express from "express";
import {
  getOptimizedFixtures,
  getTodaysFixtures,
  getUpcomingFixtures,
  getPopularLeagues,
  getHomepageFixtures,
  getMatchById,
  getMatchesByLeague,
  getLiveMatchesFromCache,
  updateLeaguePopularity,
  getAllLiveOddsMap,
} from "../controllers/fixtures.controller.js";

import { authenticateToken, requireAdmin } from "../middlewares/auth.js";
import League from '../models/League.js';
import fixtureService from '../services/fixture.service.js';

const fixturesRouter = express.Router();

// Public routes (cached and optimized)
fixturesRouter.get("/", getOptimizedFixtures);
fixturesRouter.get("/homepage", getHomepageFixtures);
fixturesRouter.get("/today", getTodaysFixtures);
fixturesRouter.get("/upcoming", getUpcomingFixtures);
fixturesRouter.get("/leagues/popular", getPopularLeagues);
fixturesRouter.get("/live", getLiveMatchesFromCache);
fixturesRouter.get("/live/odds", getAllLiveOddsMap);
// Test endpoint to compare optimization
fixturesRouter.get("/upcoming", getUpcomingFixtures);
fixturesRouter.get("/:matchId", getMatchById);

// Add new route for matches by league
fixturesRouter.get("/league/:leagueId", getMatchesByLeague);

// Update league popular status (admin only)
fixturesRouter.post('/leagues/popular', authenticateToken, updateLeaguePopularity);

// NOTE: These are admin routes for monitoring and cache management
// // Protected routes for monitoring and admin
// fixturesRouter.get(
//   "/cache/stats",
//   requireAuth,

//   getCacheStats
// );
// fixturesRouter.post(
//   "/cache/clear",
//   requireAuth,
//   requireRole(["admin"]),
//   clearCache
// );
// fixturesRouter.post(
//   "/preload",
//   requireAuth,
//   requireRole(["admin"]),
//   preloadData
// );

export default fixturesRouter;

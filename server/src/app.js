import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import connectDB from "./config/database.js";
import {
  notFound,
  errorHandler,
  requireAdmin,
  authenticateToken,
} from "./middlewares/index.js";
import sportsMonkRouter from "./routes/sportsMonk.routes.js";

import fixturesRouter from "./routes/fixtures.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import financeRoutes from "./routes/finance.routes.js";
import betRoutes from "./routes/bet.routes.js";
import agenda from "./config/agenda.js";
import BetService from "./services/bet.service.js";
import fixtureOptimizationService from "./services/fixture.service.js";
import LiveFixturesService from "./services/LiveFixtures.service.js";
import MatchSchedulerService from "./services/MatchScheduler.service.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Connect to MongoDB
connectDB();

app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || "http://localhost:3000",
      "https://betting-website-tau.vercel.app", // Remove trailing slash
      "https://betting-website-tau.vercel.app/",
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json());
app.use(cookieParser());

// Simple Morgan configuration - shows device and request type
morgan.token("device", (req) => {
  const userAgent = req.headers["user-agent"] || "Unknown";
  if (userAgent.includes("Mobile")) return "Mobile";
  if (userAgent.includes("Tablet")) return "Tablet";
  if (userAgent.includes("Chrome")) return "Chrome Browser";
  if (userAgent.includes("Firefox")) return "Firefox Browser";
  if (userAgent.includes("Safari")) return "Safari Browser";
  if (userAgent.includes("Postman")) return "Postman";
  if (userAgent.includes("curl")) return "cURL";
  return "Unknown Device";
});

// Custom format: Device and Request Type
app.use(morgan(":device made :method request to: :url"));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sportsmonk", sportsMonkRouter);
app.use("/api/fixtures", fixturesRouter);
app.use("/api/finance", authenticateToken, financeRoutes);
app.use("/api/bet", betRoutes);

// 404 handler - must be after all routes
app.use(notFound);
// Global error handler - must be last middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

global.fixtureOptimizationService = fixtureOptimizationService;

// Create services with shared cache for consistency
const matchSchedulerService = new MatchSchedulerService(fixtureOptimizationService.fixtureCache);
const liveFixturesService = new LiveFixturesService(fixtureOptimizationService.fixtureCache, matchSchedulerService.liveOddsCache);
// Connect the services to share cache and avoid inconsistency
liveFixturesService.setMatchScheduler(matchSchedulerService);

//INFO: checking the bet outcome of a bet at a scheduled time
agenda.define("checkBetOutcome", async (job) => {
  const { betId, matchId } = job.attrs.data;
  try {
    await BetService.checkBetOutcome(betId);
    console.log(
      `Bet ${betId} outcome checked by Agenda at ${new Date().toISOString()}`
    );
  } catch (error) {
    console.error(`Error checking bet ${betId} outcome via Agenda:`, error);
  }
});

// Define the Agenda job for updating live odds
// Scheduled job to update live match odds every 3 minutes
agenda.define("updateLiveOdds", async (job) => {
  try {
    await liveFixturesService.updateAllLiveOdds();
    // Log successful completion of live odds update job
    console.log(`[Agenda] Live odds updated at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[Agenda] Error updating live odds:", error);
  }
});

// Define the new match scheduler jobs
agenda.define("checkMatchStart", async (job) => {
  const { matchIds, expectedStartTime, checkCount } = job.attrs.data;
  try {
    await matchSchedulerService.checkMatchesStarted(matchIds, expectedStartTime, checkCount);
    console.log(`[Agenda] Checked ${matchIds.length} matches for start status at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[Agenda] Error checking match start:", error);
  }
});

agenda.define("checkDelayedMatches", async (job) => {
  try {
    await matchSchedulerService.checkDelayedMatches();
    console.log(`[Agenda] Checked delayed matches at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[Agenda] Error checking delayed matches:", error);
  }
});

// Daily cleanup job
agenda.define("cleanupScheduler", async (job) => {
  try {
    await matchSchedulerService.cleanup();
    console.log(`[Agenda] Scheduler cleanup completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[Agenda] Error during scheduler cleanup:", error);
  }
});

// Initialize scheduler and schedule jobs after Agenda is ready
async function initializeScheduler() {
  try {
    await agenda.start();
    console.log('[App] Agenda started successfully');
    
    // Now safely initialize the match scheduler
    await matchSchedulerService.initializeScheduler();
    
    // Schedule recurring jobs
    await agenda.every("3 minutes", "updateLiveOdds");
    await agenda.every("24 hours", "cleanupScheduler"); // Daily cleanup
    
    console.log('[App] All scheduler jobs initialized successfully');
  } catch (error) {
    console.error('[App] Error initializing scheduler:', error);
  }
}

// Schedule the jobs when agenda is ready
agenda.on("ready", () => {
  console.log("[Agenda] Ready and connected to MongoDB");
  // Initialize scheduler after agenda is ready
  initializeScheduler();
});

agenda.on("error", (err) => {
  console.error("[Agenda] Error:", err);
});

// Log when agenda jobs start executing
agenda.on("start", (job) => {
  console.log(`[Agenda] Job ${job.attrs.name} starting. Data:`, job.attrs.data);
});

agenda.on("fail", (err, job) => {
  console.error(`[Agenda] Job ${job.attrs.name} failed:`, err);
});

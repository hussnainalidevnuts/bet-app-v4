import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { createServer } from "http";
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
import fixtureOptimizationService from "./services/fixture.service.js";
import LiveFixturesService from "./services/LiveFixtures.service.js";
import { initializeSocket } from "./config/socket.js";
import { setupAgendaListeners } from "./config/agendaJobs.js";

const app = express();
const server = createServer(app);
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



// Check if fixtureOptimizationService is properly imported
if (!fixtureOptimizationService) {
  console.error('[App] ERROR: fixtureOptimizationService import failed!');
  process.exit(1);
}

console.log('[App] fixtureOptimizationService:', typeof fixtureOptimizationService);
console.log('[App] fixtureOptimizationService.fixtureCache:', typeof fixtureOptimizationService.fixtureCache);

// Set global services
global.fixtureOptimizationService = fixtureOptimizationService;

// Create LiveFixtures service
const liveFixturesService = new LiveFixturesService(fixtureOptimizationService.fixtureCache);
global.liveFixturesService = liveFixturesService;

console.log('[App] Global services initialized successfully');
console.log('[App] liveFixturesService:', typeof liveFixturesService);
console.log('[App] global.fixtureOptimizationService:', typeof global.fixtureOptimizationService);
console.log('[App] global.liveFixturesService:', typeof global.liveFixturesService);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      fixtureOptimizationService: !!global.fixtureOptimizationService,
      liveFixturesService: !!global.liveFixturesService
    }
  });
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

// Initialize Socket.IO
const io = initializeSocket(server);

// Set Socket.IO instance in LiveFixtures service
liveFixturesService.setSocketIO(io);

// Make io available to services
app.set('io', io);

// Set up Agenda listeners
setupAgendaListeners();

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}/api`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket server ready on port ${PORT}`);
});

// Export server instead of app for Socket.IO
export { server as default };

// import cron from "node-cron";
// import BetService from "../services/bet.service.js";
// import Bet from "../models/bet.model.js";
// import FixtureOptimizationService from "../services/fixture.service.js";

// // Update odds for active matches every 5 minutes
// cron.schedule("*/5 * * * *", async () => {
//   console.log("Updating match odds...");
//   try {
//     const activeMatches = await Bet.distinct("matchId", { status: "pending" });
//     if (activeMatches.length > 0) {
//       await BetService.updateMatchOdds(activeMatches);
//     } else {
//       console.log("No active matches with pending bets");
//     }
//   } catch (error) {
//     console.error("Error updating match odds:", error);
//   }
// });

// // Preload active matches on startup
// FixtureOptimizationService.preloadActiveMatches().catch((error) => {
//   console.error("Error preloading active matches:", error);
// });

import agenda from "./agenda.js";
import BetService from "../services/bet.service.js";
import LiveFixturesService from "../services/LiveFixtures.service.js";

// Get LiveFixtures service instance
const getLiveFixturesService = () => {
  return global.liveFixturesService;
};

// Define the Agenda job for checking bet outcomes
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
agenda.define("updateLiveOdds", async (job) => {
  try {
    const liveFixturesService = getLiveFixturesService();
    if (liveFixturesService) {
      await liveFixturesService.updateAllLiveOdds();
      console.log(`[Agenda] Live odds updated at ${new Date().toISOString()}`);
    } else {
      console.warn('[Agenda] LiveFixtures service not available');
    }
  } catch (error) {
    console.error("[Agenda] Error updating live odds:", error);
  }
});

// Define inplay matches update job
agenda.define("updateInplayMatches", async (job) => {
  try {
    const liveFixturesService = getLiveFixturesService();
    if (liveFixturesService) {
      await liveFixturesService.updateInplayMatches();
      console.log(`[Agenda] Inplay matches updated at ${new Date().toISOString()}`);
    } else {
      console.warn('[Agenda] LiveFixtures service not available');
    }
  } catch (error) {
    console.error("[Agenda] Error updating inplay matches:", error);
  }
});

// Initialize agenda jobs
export const initializeAgendaJobs = async () => {
  try {
    await agenda.start();
    console.log('[Agenda] Agenda started successfully');
    
    // Schedule recurring jobs
    await agenda.every("1 second", "updateLiveOdds"); // Update odds every 1 second
    await agenda.every("5 minutes", "updateInplayMatches"); // Update inplay matches every 5 minutes
    
    console.log('[Agenda] All agenda jobs initialized successfully');
  } catch (error) {
    console.error('[Agenda] Error initializing agenda:', error);
  }
};

// Set up agenda event listeners
export const setupAgendaListeners = () => {
  agenda.on("ready", () => {
    console.log("[Agenda] Ready and connected to MongoDB");
    // Initialize agenda after agenda is ready
    initializeAgendaJobs();
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
}; 
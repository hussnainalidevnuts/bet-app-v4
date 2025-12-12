import agenda from "./agenda.js";
import BetService from "../services/bet.service.js";
import LiveFixturesService from "../services/LiveFixtures.service.js";
import { UnibetCalcController } from "../controllers/unibetCalc.controller.js";
import { FotmobController } from "../controllers/fotmob.controller.js";

// Get LiveFixtures service instance
const getLiveFixturesService = () => {
  return global.liveFixturesService;
};

// Get FixtureOptimization service instance
const getFixtureOptimizationService = () => {
  return global.fixtureOptimizationService;
};

// Track if jobs are currently scheduled
let liveOddsJobScheduled = false;
let inplayMatchesJobScheduled = false;
let homepageCacheJobScheduled = false;
let betProcessingJobScheduled = false;
let fotmobCacheJobScheduled = false;

// Function to schedule live odds job
const scheduleLiveOddsJob = async () => {
  if (!liveOddsJobScheduled) {
    try {
      console.log('[Agenda] Scheduling updateLiveOdds job...');
      await agenda.every("1 second", "updateLiveOdds");
      liveOddsJobScheduled = true;
      console.log('[Agenda] updateLiveOdds job scheduled successfully');
    } catch (error) {
      console.error('[Agenda] Failed to schedule updateLiveOdds job:', error);
    }
  }
};

// Function to schedule homepage cache job
const scheduleHomepageCacheJob = async () => {
  if (!homepageCacheJobScheduled) {
    console.log('[Agenda] Scheduling refreshHomepageCache job...');
    await agenda.every("30 minutes", "refreshHomepageCache");
    homepageCacheJobScheduled = true;
    console.log('[Agenda] refreshHomepageCache job scheduled successfully');
  }
};

// Function to cancel homepage cache job
const cancelHomepageCacheJob = async () => {
  console.log('[Agenda] Cancelling refreshHomepageCache job...');
  await agenda.cancel({ name: 'refreshHomepageCache' });
  homepageCacheJobScheduled = false;
  console.log('[Agenda] refreshHomepageCache job cancelled successfully');
};

// Function to schedule inplay matches job
const scheduleInplayMatchesJob = async () => {
  if (!inplayMatchesJobScheduled) {
    console.log('[Agenda] Scheduling updateInplayMatches job...');
    await agenda.every("1 minutes", "updateInplayMatches");
    inplayMatchesJobScheduled = true;
    console.log('[Agenda] updateInplayMatches job scheduled successfully');
  }
};

// Function to cancel live odds job
const cancelLiveOddsJob = async () => {
  console.log('[Agenda] Cancelling updateLiveOdds job...');
  await agenda.cancel({ name: 'updateLiveOdds' });
  liveOddsJobScheduled = false;
  console.log('[Agenda] updateLiveOdds job cancelled successfully');
};

// Function to cancel inplay matches job
const cancelInplayMatchesJob = async () => {
  console.log('[Agenda] Cancelling updateInplayMatches job...');
  await agenda.cancel({ name: 'updateInplayMatches' });
  inplayMatchesJobScheduled = false;
  console.log('[Agenda] updateInplayMatches job cancelled successfully');
};

// Function to schedule bet processing job
const scheduleBetProcessingJob = async () => {
  if (!betProcessingJobScheduled) {
    console.log('[Agenda] Scheduling automated bet processing job...');
    await agenda.every("5 seconds", "processPendingBets");
    betProcessingJobScheduled = true;
    console.log('[Agenda] Automated bet processing job scheduled successfully');
  }
};

// Function to cancel bet processing job
const cancelBetProcessingJob = async () => {
  console.log('[Agenda] Cancelling automated bet processing job...');
  await agenda.cancel({ name: 'processPendingBets' });
  betProcessingJobScheduled = false;
  console.log('[Agenda] Automated bet processing job cancelled successfully');
};

// Function to schedule FotMob cache refresh job
const scheduleFotmobCacheJob = async () => {
  if (!fotmobCacheJobScheduled) {
    try {
      // Schedule at 11:00 PM Pakistan Time (UTC+5) = 6:00 PM UTC (18:00 UTC)
      // Cron syntax: "minute hour dayOfMonth month dayOfWeek"
      // "0 18 * * *" = 6:00 PM UTC every day (which is 11:00 PM PKT)
      console.log('[Agenda] ========================================');
      console.log('[Agenda] Scheduling FotMob cache refresh job...');
      console.log('[Agenda] Time: 11:00 PM PKT (6:00 PM UTC)');
      console.log('[Agenda] Cron: "0 18 * * *"');
      console.log('[Agenda] ========================================');
      
      const scheduledJob = await agenda.every("0 18 * * *", "refreshFotmobMultidayCache");
      
      if (scheduledJob) {
        const nextRunPKT = scheduledJob.attrs.nextRunAt ? new Date(scheduledJob.attrs.nextRunAt.getTime() + (5 * 60 * 60 * 1000)).toISOString().replace('Z', ' PKT') : 'N/A';
        console.log('[Agenda] ✅ FotMob cache refresh job scheduled successfully!');
        console.log(`[Agenda] Job ID: ${scheduledJob.attrs._id}`);
        console.log(`[Agenda] Next run (UTC): ${scheduledJob.attrs.nextRunAt}`);
        console.log(`[Agenda] Next run (PKT): ${nextRunPKT}`);
        console.log(`[Agenda] Repeat interval: ${scheduledJob.attrs.repeatInterval}`);
        fotmobCacheJobScheduled = true;
      } else {
        console.error('[Agenda] ❌ Failed to schedule FotMob cache refresh job - no job returned');
      }
    } catch (error) {
      console.error('[Agenda] ❌ Error scheduling FotMob cache refresh job:', error);
      console.error('[Agenda] Error details:', error.stack);
    }
  } else {
    console.log('[Agenda] ⚠️ FotMob cache refresh job already scheduled, skipping...');
  }
};

// Function to cancel FotMob cache refresh job
const cancelFotmobCacheJob = async () => {
  console.log('[Agenda] Cancelling FotMob multi-day cache refresh job...');
  await agenda.cancel({ name: 'refreshFotmobMultidayCache' });
  fotmobCacheJobScheduled = false;
  console.log('[Agenda] FotMob multi-day cache refresh job cancelled successfully');
};

// Function to check fixture cache and manage jobs accordingly
export const checkFixtureCacheAndManageJobs = async () => {
  const liveFixturesService = getLiveFixturesService();
  const fixtureOptimizationService = getFixtureOptimizationService();
  
  if (!liveFixturesService) {
    console.log('[Agenda] LiveFixtures service not available - cancelling all jobs');
    await cancelLiveOddsJob();
    await cancelInplayMatchesJob();
    await cancelHomepageCacheJob();
    return;
  }
  
  if (!fixtureOptimizationService) {
    console.log('[Agenda] FixtureOptimization service not available - cancelling homepage cache job');
    await cancelHomepageCacheJob();
  }
  
  const hasFixtureData = liveFixturesService.hasFixtureCacheData();
  
  if (hasFixtureData) {
    console.log('[Agenda] Fixture cache has data - scheduling inplay matches job');
    await scheduleInplayMatchesJob();
    
    // Check if there are actual live matches for live odds job
    const hasLiveMatches = checkForLiveMatches(liveFixturesService);
    if (hasLiveMatches) {
      console.log('[Agenda] Live matches found - scheduling live odds job');
      await scheduleLiveOddsJob();
    } else {
      console.log('[Agenda] No live matches found - cancelling live odds job');
      await cancelLiveOddsJob();
    }
    
    // Only schedule homepage cache job if service is available
    if (fixtureOptimizationService) {
      await scheduleHomepageCacheJob();
    }
  } else {
    console.log('[Agenda] Fixture cache is empty - cancelling all jobs');
    await cancelLiveOddsJob();
    await cancelInplayMatchesJob();
    await cancelHomepageCacheJob();
  }
  
  // Always schedule automated bet processing and FotMob cache refresh
  console.log('[Agenda] Scheduling automated bet processing job...');
  await scheduleBetProcessingJob();
  
  console.log('[Agenda] Scheduling FotMob multi-day cache refresh job...');
  await scheduleFotmobCacheJob();
};

// Function to check if there are live matches in cache
const checkForLiveMatches = (liveFixturesService) => {
  try {
    const inplayMatches = liveFixturesService.inplayMatchesCache.get('inplay_matches') || [];
    console.log(`[Agenda] Live matches count in cache: ${inplayMatches.length}`);
    return inplayMatches.length > 0;
  } catch (error) {
    console.error('[Agenda] Error checking live matches:', error);
    return false;
  }
};

// Function to check live matches and manage live odds job dynamically
export const checkLiveMatchesAndManageLiveOddsJob = async () => {
  const liveFixturesService = getLiveFixturesService();
  
  if (!liveFixturesService) {
    console.log('[Agenda] LiveFixtures service not available - cancelling live odds job');
    await cancelLiveOddsJob();
    return;
  }
  
  const hasLiveMatches = checkForLiveMatches(liveFixturesService);
  
  if (hasLiveMatches && !liveOddsJobScheduled) {
    console.log('[Agenda] Live matches detected - starting live odds job');
    await scheduleLiveOddsJob();
  } else if (!hasLiveMatches && liveOddsJobScheduled) {
    console.log('[Agenda] No live matches - stopping live odds job');
    await cancelLiveOddsJob();
  }
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
    console.log(`[Agenda] updateLiveOdds job starting at ${new Date().toISOString()}`);
    const liveFixturesService = getLiveFixturesService();
    
    if (!liveFixturesService) {
      console.warn('[Agenda] LiveFixtures service not available - skipping live odds update');
      return;
    }
    
    // Double-check that there are still live matches before updating odds
    const hasLiveMatches = checkForLiveMatches(liveFixturesService);
    if (!hasLiveMatches) {
      console.log('[Agenda] No live matches found during odds update - skipping');
      return;
    }
    
    await liveFixturesService.updateAllLiveOdds();
    console.log(`[Agenda] Live odds updated successfully at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[Agenda] Error updating live odds:", error);
  }
});

// Define inplay matches update job
agenda.define("updateInplayMatches", async (job) => {
  try {
    console.log('[Agenda] Starting updateInplayMatches job');
    const liveFixturesService = getLiveFixturesService();
    
    if (!liveFixturesService) {
      console.warn('[Agenda] LiveFixtures service not available - skipping inplay matches update');
      return;
    }
    
    await liveFixturesService.updateInplayMatches();
    console.log(`[Agenda] Inplay matches updated at ${new Date().toISOString()}`);
    
    // Check if matches were cached
    const cachedMatches = liveFixturesService.inplayMatchesCache.get('inplay_matches') || [];
    console.log(`[Agenda] Cached matches count: ${cachedMatches.length}`);
    
    // Check live matches and manage live odds job accordingly
    await checkLiveMatchesAndManageLiveOddsJob();
    
    // Immediately update odds for the live matches
    if (cachedMatches.length > 0) {
      console.log('[Agenda] Immediately updating odds for live matches');
      await liveFixturesService.updateInplayMatchesOdds();
    }
  } catch (error) {
    console.error("[Agenda] Error updating inplay matches:", error);
  }
});

// Define homepage cache refresh job
agenda.define("refreshHomepageCache", async (job) => {
  try {
    console.log(`[Agenda] Starting refreshHomepageCache job at ${new Date().toISOString()}`);
    
    // Get the fixture optimization service
    const fixtureOptimizationService = getFixtureOptimizationService();
    
    if (!fixtureOptimizationService) {
      console.warn('[Agenda] FixtureOptimizationService not available - skipping homepage cache refresh');
      return;
    }
    
    // Clear existing cache first
    const cacheKey = "homepage_data";
    fixtureOptimizationService.fixtureCache.del(cacheKey);
    console.log('[Agenda] Cleared existing homepage cache');
    
    // Fetch fresh homepage data (this will cache it automatically)
    await fixtureOptimizationService.getHomepageData();
    console.log(`[Agenda] Homepage cache refreshed successfully at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[Agenda] Error refreshing homepage cache:", error);
  }
});

// Define automated bet processing job
agenda.define("processPendingBets", async (job) => {
  try {
    console.log(`[Agenda] Job "processPendingBets" starting at ${new Date().toISOString()}`);
    const unibetCalcController = new UnibetCalcController();
    
    // Create a mock response object to capture the JSON data
    let responseData = null;
    const mockRes = {
      json: (data) => {
        responseData = data;
        console.log(`[Agenda] Bet processing result:`, data);
        if (data.stats) {
          console.log(`[Agenda] Bet processing: ${data.stats.processed} processed, ${data.stats.failed} failed, ${data.stats.skipped} skipped`);
        }
      }
    };
    
    console.log(`[Agenda] About to call processAll with limit: 50, onlyPending: true`);
    
    // Process pending bets (finished matches only)
    const result = await unibetCalcController.processAll({
      body: { limit: 50, onlyPending: true }
    }, mockRes);
    
    console.log(`[Agenda] processAll completed, result:`, result);
    
    // If no response data was captured, log a warning
    if (!responseData) {
      console.warn(`[Agenda] No response data captured from processAll`);
    }
    
    console.log(`[Agenda] Job "processPendingBets" completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[Agenda] Error in automated bet processing:", error);
    console.error("[Agenda] Error stack:", error.stack);
  }
});

// Define FotMob multi-day cache refresh job
agenda.define("refreshFotmobMultidayCache", async (job) => {
  const now = new Date();
  const utcTime = now.toISOString();
  // Convert to Pakistan time (UTC+5)
  const pktTime = new Date(now.getTime() + (5 * 60 * 60 * 1000)).toISOString().replace('Z', ' PKT');
  
  console.log(`[Agenda] ========================================`);
  console.log(`[Agenda] 🕐 FotMob Cache Refresh Job STARTED`);
  console.log(`[Agenda] ========================================`);
  console.log(`[Agenda] UTC Time: ${utcTime}`);
  console.log(`[Agenda] Pakistan Time: ${pktTime}`);
  console.log(`[Agenda] Job ID: ${job.attrs._id}`);
  console.log(`[Agenda] Scheduled time: ${job.attrs.nextRunAt}`);
  
  try {
    
    const fotmobController = new FotmobController();
    
    // Refresh multi-day cache (20 days + yesterday = 21 days total)
    // Force refresh at scheduled time (11:00 PM PKT) - MUST refresh at this time
    const result = await fotmobController.refreshMultidayCache({
      body: { days: 20, forceRefresh: true }
    }, {
      json: (data) => {
        console.log(`[Agenda] FotMob cache refresh completed:`, data);
      }
    });
    
    
    const endTime = new Date();
    const endUtcTime = endTime.toISOString();
    const endPktTime = new Date(endTime.getTime() + (5 * 60 * 60 * 1000)).toISOString().replace('Z', ' PKT');
    const duration = ((endTime.getTime() - now.getTime()) / 1000).toFixed(2);
    
    console.log(`[Agenda] ========================================`);
    console.log(`[Agenda] ✅ FotMob Cache Refresh Job COMPLETED`);
    console.log(`[Agenda] ========================================`);
    console.log(`[Agenda] Completed at UTC: ${endUtcTime}`);
    console.log(`[Agenda] Completed at PKT: ${endPktTime}`);
    console.log(`[Agenda] Duration: ${duration} seconds`);
    console.log(`[Agenda] Result:`, result);
  } catch (error) {
    console.error(`[Agenda] ========================================`);
    console.error(`[Agenda] ❌ FotMob Cache Refresh Job FAILED`);
    console.error(`[Agenda] ========================================`);
    console.error(`[Agenda] Error at UTC: ${utcTime}`);
    console.error(`[Agenda] Error at PKT: ${pktTime}`);
    console.error("[Agenda] Error details:", error);
    console.error("[Agenda] Error stack:", error.stack);
  }
});

// Initialize agenda jobs
export const initializeAgendaJobs = async () => {
  try {
    await agenda.start();
    console.log('[Agenda] Agenda started successfully');
    
    // Aggressive cleanup - remove ALL existing jobs
    console.log('[Agenda] Cleaning up all existing jobs...');
    const existingJobs = await agenda.jobs({});
    console.log(`[Agenda] Found ${existingJobs.length} existing jobs to clean up`);
    
    // Log existing FotMob cache jobs before cleanup
    const existingFotmobJobs = existingJobs.filter(job => job.attrs.name === 'refreshFotmobMultidayCache');
    if (existingFotmobJobs.length > 0) {
      console.log(`[Agenda] Found ${existingFotmobJobs.length} existing FotMob cache job(s):`);
      existingFotmobJobs.forEach((job, index) => {
        const nextRunPKT = job.attrs.nextRunAt ? new Date(job.attrs.nextRunAt.getTime() + (5 * 60 * 60 * 1000)).toISOString().replace('Z', ' PKT') : 'N/A';
        console.log(`[Agenda]   Job ${index + 1}: ID=${job.attrs._id}, Next run (PKT)=${nextRunPKT}, Interval=${job.attrs.repeatInterval}`);
      });
    }
    
    // Cancel all jobs by name
    await agenda.cancel({ name: 'updateLiveOdds' });
    await agenda.cancel({ name: 'updateInplayMatches' });
    await agenda.cancel({ name: 'refreshHomepageCache' });
    await agenda.cancel({ name: 'processPendingBets' });
    const cancelledFotmob = await agenda.cancel({ name: 'refreshFotmobMultidayCache' });
    console.log(`[Agenda] Cancelled FotMob cache jobs: ${cancelledFotmob} jobs removed`);
    await agenda.cancel({ name: 'checkBetOutcome' }); // Cancel old bet outcome jobs
    
    // Remove any remaining jobs
    for (const job of existingJobs) {
      try {
        await job.remove();
      } catch (error) {
        console.warn(`[Agenda] Could not remove job ${job.attrs.name}:`, error.message);
      }
    }
    
    console.log(`[Agenda] Cleanup completed. All old jobs removed.`);
    
    // Reset tracking flags
    liveOddsJobScheduled = false;
    inplayMatchesJobScheduled = false;
    homepageCacheJobScheduled = false;
    betProcessingJobScheduled = false;
    fotmobCacheJobScheduled = false;
    console.log('[Agenda] Cleaned up all existing jobs and reset tracking');
    
    // Wait a moment for services to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check fixture cache and manage jobs accordingly
    await checkFixtureCacheAndManageJobs();
    
    // Immediately refresh FotMob cache when server starts (force refresh on startup)
    console.log('[Agenda] Triggering immediate FotMob cache refresh on server startup...');
    try {
      const fotmobController = new FotmobController();
      await fotmobController.refreshMultidayCache({
        body: { days: 20, forceRefresh: true }
      }, {
        json: (data) => {
          console.log(`[Agenda] FotMob cache refresh completed on startup:`, data);
        }
      });
      console.log('[Agenda] FotMob cache refresh completed successfully on startup');
    } catch (error) {
      console.error('[Agenda] Error refreshing FotMob cache on startup:', error);
      // Don't block server startup if cache refresh fails
    }
    
    console.log('[Agenda] Agenda jobs initialization completed');
    
    // Log current scheduled jobs (summary only)
    const jobs = await agenda.jobs({});
    console.log(`[Agenda] Total scheduled jobs: ${jobs.length}`);
    
    // Group jobs by name and show summary
    const jobSummary = {};
    jobs.forEach(job => {
      const name = job.attrs.name;
      if (!jobSummary[name]) {
        jobSummary[name] = { count: 0, nextRun: job.attrs.nextRunAt, interval: job.attrs.repeatInterval };
      }
      jobSummary[name].count++;
    });
    
    Object.entries(jobSummary).forEach(([name, info]) => {
      const nextRunPKT = info.nextRun ? new Date(info.nextRun.getTime() + (5 * 60 * 60 * 1000)).toISOString().replace('Z', ' PKT') : 'N/A';
      console.log(`[Agenda] Job: ${name}, Count: ${info.count}, Next run (UTC): ${info.nextRun}, Next run (PKT): ${nextRunPKT}, Interval: ${info.interval}`);
      
      // Special logging for FotMob cache job
      if (name === 'refreshFotmobMultidayCache') {
        console.log(`[Agenda] ⏰ FotMob Cache Job Details:`);
        console.log(`[Agenda]    - Scheduled: ${fotmobCacheJobScheduled ? 'YES' : 'NO'}`);
        console.log(`[Agenda]    - Next run UTC: ${info.nextRun}`);
        console.log(`[Agenda]    - Next run PKT: ${nextRunPKT}`);
        console.log(`[Agenda]    - Cron interval: ${info.interval}`);
        if (info.nextRun) {
          const now = new Date();
          const timeUntilNext = info.nextRun.getTime() - now.getTime();
          const hoursUntil = Math.floor(timeUntilNext / (1000 * 60 * 60));
          const minsUntil = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
          console.log(`[Agenda]    - Time until next run: ${hoursUntil}h ${minsUntil}m`);
        }
      }
    });
    
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
    console.log(`[Agenda] Job "${job.attrs.name}" starting at ${new Date().toISOString()}`);
  });

  agenda.on("complete", (job) => {
    console.log(`[Agenda] Job "${job.attrs.name}" completed at ${new Date().toISOString()}`);
  });

  agenda.on("fail", (err, job) => {
    console.error(`[Agenda] Job "${job.attrs.name}" failed at ${new Date().toISOString()}:`, err);
  });
}; 
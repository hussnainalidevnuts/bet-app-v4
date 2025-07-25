import Queue from 'queue-fifo';
import agenda from '../config/agenda.js';
import sportsMonksService from './sportsMonks.service.js';
import NodeCache from 'node-cache';

class MatchSchedulerService {
  constructor(fixtureCache) {
    this.fixtureCache = fixtureCache;
    this.matchQueue = new Queue();
    this.delayedMatches = new Map(); // Match ID -> { originalStartTime, checkCount }
    this.liveMatchesCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
    this.liveOddsCache = new NodeCache({ stdTTL: 180 }); // 3 minutes
    this.scheduledJobs = new Map(); // Track scheduled jobs
    
    // Don't initialize here - wait for explicit call after Agenda is ready
    console.log('[MatchScheduler] Service created, waiting for initialization...');
  }

  /**
   * Initialize the scheduler by processing today's matches
   */
  async initializeScheduler() {
    try {
      console.log('[MatchScheduler] Initializing match scheduler...');
      await this.processTodaysMatches();
      await this.scheduleDelayedMatchCheck();
      console.log('[MatchScheduler] Scheduler initialized successfully');
    } catch (error) {
      console.error('[MatchScheduler] Error initializing scheduler:', error);
    }
  }

  /**
   * Process today's matches and queue them by start time
   */
  async processTodaysMatches() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get today's fixtures from cache
    const cacheKey = `fixtures_today_to_7days_${todayStr}`;
    const cachedFixtures = this.fixtureCache.get(cacheKey);
    
    if (!cachedFixtures) {
      console.log('[MatchScheduler] No cached fixtures found for today');
      return;
    }

    const todaysMatches = [];
    let fixtures = [];
    
    if (cachedFixtures instanceof Map) {
      fixtures = Array.from(cachedFixtures.values());
    } else if (Array.isArray(cachedFixtures)) {
      fixtures = cachedFixtures;
    }

    // Filter matches for today using proper timezone parsing
    for (const match of fixtures) {
      const matchDate = this.parseMatchStartTime(match.starting_at);
      if (matchDate && this.isSameDay(matchDate, today)) {
        todaysMatches.push({
          id: match.id,
          starting_at: match.starting_at,
          startTime: matchDate.getTime() // UTC timestamp
        });
      }
    }

    // Sort by start time and queue them
    todaysMatches.sort((a, b) => a.startTime - b.startTime);
    
    // Group matches by start time for batch processing
    const matchGroups = this.groupMatchesByStartTime(todaysMatches);
    
    // Schedule agenda jobs for each time slot
    for (const [startTime, matches] of matchGroups) {
      await this.scheduleMatchCheck(startTime, matches);
    }

    console.log(`[MatchScheduler] Queued ${todaysMatches.length} matches in ${matchGroups.size} time slots for today (${todayStr} UTC)`);
  }

  /**
   * Helper method to properly parse starting_at field (same as bet.service.js)
   */
  parseMatchStartTime(startingAt) {
    if (!startingAt) return null;

    let parsedDate;

    if (typeof startingAt === "string") {
      // Check if the string includes timezone info
      if (
        startingAt.includes("T") ||
        startingAt.includes("Z") ||
        startingAt.includes("+") ||
        (startingAt.includes("-") && startingAt.split("-").length > 3)
      ) {
        // String has timezone info, parse normally
        parsedDate = new Date(startingAt);
      } else {
        // String doesn't have timezone info, treat as UTC
        // Format: "2025-07-05 14:30:00" should be treated as UTC
        let [date, time] = startingAt.split(" ");
        if (!time) time = "00:00:00";
        
        // Ensure proper format and add Z for UTC
        const isoString = `${date}T${time}Z`;
        parsedDate = new Date(isoString);
      }
    } else if (startingAt instanceof Date) {
      parsedDate = startingAt;
    } else {
      return null;
    }

    // Check if the date is valid
    if (isNaN(parsedDate.getTime())) {
      console.error(`[MatchScheduler] Invalid date created from: ${startingAt}`);
      return null;
    }

    return parsedDate;
  }

  /**
   * Group matches by their start time (within 1 minute tolerance)
   */
  groupMatchesByStartTime(matches) {
    const groups = new Map();
    
    for (const match of matches) {
      const roundedTime = Math.floor(match.startTime / 60000) * 60000; // Round to nearest minute
      
      if (!groups.has(roundedTime)) {
        groups.set(roundedTime, []);
      }
      groups.get(roundedTime).push(match);
    }
    
    return groups;
  }

  /**
   * Schedule an agenda job to check matches at their start time
   */
  async scheduleMatchCheck(startTime, matches) {
    const now = new Date(); // Current UTC time
    const checkTime = new Date(startTime); // Match start time in UTC
    
    // Don't schedule jobs for past times
    if (startTime <= now.getTime()) {
      console.log(`[MatchScheduler] Skipping past match time: ${checkTime.toISOString()} UTC`);
      return;
    }

    const jobName = `checkMatchStart_${startTime}`;
    const jobData = {
      matchIds: matches.map(m => m.id),
      expectedStartTime: startTime,
      checkCount: 0
    };

    // Cancel existing job if any
    if (this.scheduledJobs.has(jobName)) {
      await agenda.cancel({ name: jobName });
    }

    // Schedule new job - Agenda will handle this in UTC
    await agenda.schedule(checkTime, 'checkMatchStart', jobData);
    this.scheduledJobs.set(jobName, { startTime, matchCount: matches.length });
    
    console.log(`[MatchScheduler] Scheduled check for ${matches.length} matches at ${checkTime.toISOString()} UTC`);
  }

  /**
   * Check if matches have started using the livescores API
   */
  async checkMatchesStarted(matchIds, expectedStartTime, checkCount = 0) {
    try {
      console.log(`[MatchScheduler] Checking ${matchIds.length} matches for start status (attempt ${checkCount + 1})`);
      
      // Call the livescores API
      const response = await sportsMonksService.client.get('/football/livescores/inplay', {
        params: {
          include: 'periods'
        }
      });

      const liveMatches = response.data?.data || [];
      const liveMatchIds = new Set(liveMatches.map(m => m.id));
      
      const startedMatches = [];
      const notStartedMatches = [];
      const delayedMatches = [];

      for (const matchId of matchIds) {
        const liveMatch = liveMatches.find(m => m.id === matchId);
        
        if (liveMatch) {
          // Check if match has actually started (has periods and is ticking)
          const hasStartedPeriod = liveMatch.periods?.some(p => p.started && p.ticking);
          
          if (hasStartedPeriod) {
            startedMatches.push({
              ...liveMatch,
              cacheTime: Date.now(),
              matchStarted: true
            });
          } else if (liveMatch.state_id === 16 || (liveMatch.state && typeof liveMatch.state.name === 'string' && liveMatch.state.name.toUpperCase() === 'DELAYED')) {
            // State 16 or name 'DELAYED' = indefinitely delayed, do not retry
            console.log(`[MatchScheduler] Match ${matchId} is indefinitely delayed (state_id 16 or name DELAYED), removing from retry list.`);
            // Do not add to delayedMatches or notStartedMatches
          } else {
            notStartedMatches.push(matchId);
          }
        } else {
          // Not in live matches, might not have started yet
          notStartedMatches.push(matchId);
        }
      }

      // Process started matches
      for (const match of startedMatches) {
        await this.processStartedMatch(match);
      }

      // Handle delayed matches
      for (const matchId of delayedMatches) {
        this.delayedMatches.set(matchId, {
          originalStartTime: expectedStartTime,
          checkCount: checkCount + 1
        });
      }

      // Reschedule check for matches that haven't started (up to 10 attempts)
      if (notStartedMatches.length > 0 && checkCount < 10) {
        // Schedule for 5 minutes from now in UTC
        const nextCheckTime = new Date(Date.now() + 5 * 60 * 1000);
        await agenda.schedule(nextCheckTime, 'checkMatchStart', {
          matchIds: notStartedMatches,
          expectedStartTime,
          checkCount: checkCount + 1
        });
        
        console.log(`[MatchScheduler] Rescheduled check for ${notStartedMatches.length} matches at ${nextCheckTime.toISOString()} UTC (attempt ${checkCount + 1}/10)`);
      }

      console.log(`[MatchScheduler] Results - Started: ${startedMatches.length}, Delayed: ${delayedMatches.length}, Not Started: ${notStartedMatches.length}`);
      
    } catch (error) {
      console.error('[MatchScheduler] Error checking match start status:', error);
    }
  }

  /**
   * Process a match that has started
   */
  async processStartedMatch(liveMatch) {
    try {
      // Get full match details from cache
      const matchDetails = await this.getMatchDetailsFromCache(liveMatch.id);
      
      if (!matchDetails) {
        console.log(`[MatchScheduler] No cached details found for match ${liveMatch.id}`);
        return;
      }

      // Extract timing information from periods
      const currentPeriod = liveMatch.periods?.find(p => p.ticking);
      const timingInfo = {
        matchStarted: liveMatch.periods?.[0]?.started || Date.now() / 1000, // Unix timestamp from API
        currentMinute: currentPeriod?.minutes || 0,
        currentSecond: currentPeriod?.seconds || 0,
        period: currentPeriod?.description || '1st-half',
        cacheTime: Date.now(), // Our cache timestamp in milliseconds
        cacheTimeUTC: new Date().toISOString() // UTC string for debugging
      };

      // Cache the live match with timing info
      const liveMatchData = {
        ...matchDetails,
        ...liveMatch,
        timing: timingInfo,
        isLive: true
      };

      this.liveMatchesCache.set(liveMatch.id, liveMatchData);
      
      // Fetch and cache odds for this match
      await this.fetchAndCacheMatchOdds(liveMatch.id);
      
      console.log(`[MatchScheduler] Processed started match ${liveMatch.id} - ${liveMatch.name}`);
      
    } catch (error) {
      console.error(`[MatchScheduler] Error processing started match ${liveMatch.id}:`, error);
    }
  }

  /**
   * Get match details from fixture cache
   */
  async getMatchDetailsFromCache(matchId) {
    const cacheKeys = this.fixtureCache.keys();
    
    for (const key of cacheKeys) {
      const cachedData = this.fixtureCache.get(key);
      
      if (cachedData instanceof Map) {
        const match = cachedData.get(matchId);
        if (match) return match;
      } else if (Array.isArray(cachedData)) {
        const match = cachedData.find(m => m.id === matchId);
        if (match) return match;
      }
    }
    
    return null;
  }

  /**
   * Fetch and cache odds for a live match with unified format
   */
  async fetchAndCacheMatchOdds(matchId) {
    try {
      // Check if odds are already cached and fresh
      const cachedOdds = this.liveOddsCache.get(matchId);
      if (cachedOdds && cachedOdds.betting_data) {
        console.log(`[MatchScheduler] Using cached transformed odds for match ${matchId}`);
        return cachedOdds;
      }

      // Fetch fresh odds using inplayOdds (same as LiveFixtures service)
      const response = await sportsMonksService.client.get(`/football/fixtures/${matchId}`, {
        params: {
          include: 'inplayOdds',
          filters: 'bookmakers:2'
        }
      });

      const matchData = response.data?.data;
      if (matchData?.inplayodds) {
        // Transform odds to the same format as LiveFixtures service expects
        const transformedOdds = await this.transformOddsToUnifiedFormat(matchData.inplayodds, matchId);
        
        if (transformedOdds) {
          // Store in unified format that both services can use
          this.liveOddsCache.set(matchId, transformedOdds);
          console.log(`[MatchScheduler] Cached fresh transformed odds for match ${matchId}`);
          return transformedOdds;
        }
      }
      
    } catch (error) {
      console.error(`[MatchScheduler] Error fetching odds for match ${matchId}:`, error);
    }
    
    return null;
  }

  /**
   * Transform raw odds to unified format used by LiveFixtures service
   */
  async transformOddsToUnifiedFormat(rawOdds, matchId) {
    try {
      // Import the classification functions
      const { classifyOdds, transformToBettingData } = await import('../utils/oddsClassification.js');
      
      // Define the same allowed market IDs
      const allowedMarketIds = [
        1, 2, 267, 268, 29, 90, 93, 95, 124, 125, 10, 14, 18, 19, 44, 4, 5, 81,
        37, 11, 97, 13, 86, 80, 60, 67, 68, 69,
      ];

      // Filter odds by allowed market IDs
      let filteredOdds = rawOdds.filter((odd) =>
        allowedMarketIds.includes(odd.market_id)
      );

      // Get match details for team names
      const matchDetails = await this.getMatchDetailsFromCache(matchId);

      // Group odds by market for classification
      const odds_by_market = {};
      for (const odd of filteredOdds) {
        if (!odd.market_id) continue;
        if (!odds_by_market[odd.market_id]) {
          odds_by_market[odd.market_id] = {
            market_id: odd.market_id,
            market_description: odd.market_description,
            odds: [],
          };
        }
        odds_by_market[odd.market_id].odds.push(odd);
        odds_by_market[odd.market_id].market_description = odd.market_description;
      }

      const classified = classifyOdds({ odds_by_market });
      const betting_data = transformToBettingData(classified, matchDetails);

      return {
        betting_data,
        odds_classification: classified,
        cached_at: Date.now(),
        source: 'match_scheduler'
      };

    } catch (error) {
      console.error(`[MatchScheduler] Error transforming odds for match ${matchId}:`, error);
      return null;
    }
  }

  /**
   * Schedule job to check delayed matches every 5 minutes
   */
  async scheduleDelayedMatchCheck() {
    await agenda.every('5 minutes', 'checkDelayedMatches');
    console.log('[MatchScheduler] Scheduled delayed match check every 5 minutes');
  }

  /**
   * Check delayed matches for start status and clean up finished matches
   */
  async checkDelayedMatches() {
    try {
      // Always make API call to check both delayed matches and cleanup finished ones
      const cachedLiveMatchIds = this.liveMatchesCache.keys();
      const hasDelayedMatches = this.delayedMatches.size > 0;
      const hasLiveMatches = cachedLiveMatchIds.length > 0;
      
      if (!hasDelayedMatches && !hasLiveMatches) {
        console.log('[MatchScheduler] No delayed or live matches to check - skipping API call');
        return;
      }
      
      console.log(`[MatchScheduler] Checking matches: ${this.delayedMatches.size} delayed, ${cachedLiveMatchIds.length} live cached - making API call`);

      // Get current live matches from API
      const response = await sportsMonksService.client.get('/football/livescores/inplay', {
        params: {
          include: 'periods'
        }
      });

      const liveMatches = response.data?.data || [];
      const currentLiveMatchIds = new Set(liveMatches.map(match => match.id));
      
      // Process delayed matches if any
      if (hasDelayedMatches) {
        let processedCount = 0;
        let startedCount = 0;
        let removedCount = 0;
        
        for (const liveMatch of liveMatches) {
          if (this.delayedMatches.has(liveMatch.id)) {
            processedCount++;
            const hasStartedPeriod = liveMatch.periods?.some(p => p.started && p.ticking);
            
            if (hasStartedPeriod) {
              // Match started, process it
              await this.processStartedMatch(liveMatch);
              this.delayedMatches.delete(liveMatch.id);
              startedCount++;
              console.log(`[MatchScheduler] Delayed match ${liveMatch.id} has started`);
            } else if (liveMatch.state_id !== 16 && 
                       !(liveMatch.state && typeof liveMatch.state.name === 'string' && liveMatch.state.name.toUpperCase() === 'DELAYED')) {
              // No longer delayed but not started, remove from delayed list
              this.delayedMatches.delete(liveMatch.id);
              removedCount++;
              console.log(`[MatchScheduler] Match ${liveMatch.id} no longer delayed, removing from list`);
            }
          }
        }

        // Clean up old delayed matches (older than 3 hours)
        const now = Date.now();
        const oldMatches = [];
        for (const [matchId, delayedInfo] of this.delayedMatches) {
          if (delayedInfo.checkCount > 20 || 
              (now - delayedInfo.originalStartTime) > (3 * 60 * 60 * 1000)) { // 3 hours old
            oldMatches.push(matchId);
          }
        }
        
        for (const matchId of oldMatches) {
          this.delayedMatches.delete(matchId);
        }

        console.log(`[MatchScheduler] Delayed matches summary: ${processedCount} processed, ${startedCount} started, ${removedCount} removed, ${oldMatches.length} cleaned up. Remaining: ${this.delayedMatches.size}`);
      }

      // Clean up finished matches from live cache (always run this when we have live matches)
      if (hasLiveMatches) {
        await this.cleanupFinishedMatches(currentLiveMatchIds);
      }
      
    } catch (error) {
      console.error('[MatchScheduler] Error in checkDelayedMatches:', error);
    }
  }

  /**
   * Clean up finished matches from live cache
   * Compare cache with current API response to find finished matches
   */
  async cleanupFinishedMatches(currentLiveMatchIds) {
    const cachedLiveMatchIds = this.liveMatchesCache.keys();
    const finishedMatches = [];
    
    // Find matches that are in cache but not in current API response
    for (const cachedMatchId of cachedLiveMatchIds) {
      if (!currentLiveMatchIds.has(parseInt(cachedMatchId))) {
        finishedMatches.push(cachedMatchId);
      }
    }
    
    if (finishedMatches.length === 0) {
      console.log('[MatchScheduler] No finished matches to clean up');
      return;
    }
    
    console.log(`[MatchScheduler] Cleaning up ${finishedMatches.length} finished matches from cache`);
    
    // Remove finished matches from both caches
    for (const matchId of finishedMatches) {
      const match = this.liveMatchesCache.get(matchId);
      
      // Log the cleanup with match details
      if (match) {
        console.log(`[MatchScheduler] Removing finished match ${matchId} - ${match.name || 'Unknown'} from live cache`);
      } else {
        console.log(`[MatchScheduler] Removing finished match ${matchId} from live cache`);
      }
      
      // Remove from live matches cache
      this.liveMatchesCache.del(matchId);
      
      // Remove from live odds cache
      this.liveOddsCache.del(matchId);
      
      // Remove from delayed matches if present
      if (this.delayedMatches.has(parseInt(matchId))) {
        this.delayedMatches.delete(parseInt(matchId));
        console.log(`[MatchScheduler] Also removed match ${matchId} from delayed matches`);
      }
    }
    
    const remainingLiveMatches = this.liveMatchesCache.keys().length;
    const remainingDelayedMatches = this.delayedMatches.size;
    
    console.log(`[MatchScheduler] Cleanup completed. Remaining live matches: ${remainingLiveMatches}, delayed matches: ${remainingDelayedMatches}`);
  }

  /**
   * Get all live matches from cache with fresh odds
   */
  async getLiveMatches() {
    const liveMatches = [];
    const cacheKeys = this.liveMatchesCache.keys();
    
    for (const matchId of cacheKeys) {
      const match = this.liveMatchesCache.get(matchId);
      if (match) {
        // Get fresh odds for the match
        const odds = this.liveOddsCache.get(matchId) || 
                    await this.fetchAndCacheMatchOdds(matchId);
        
        liveMatches.push({
          ...match,
          odds: odds || []
        });
      }
    }
    
    return liveMatches;
  }

  /**
   * Utility function to check if two dates are the same day
   */
  isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * Clean up old scheduled jobs and cached data
   */
  async cleanup() {
    const now = Date.now();
    
    // Remove old scheduled jobs
    for (const [jobName, jobInfo] of this.scheduledJobs) {
      if (jobInfo.startTime < now - (2 * 60 * 60 * 1000)) { // 2 hours old
        this.scheduledJobs.delete(jobName);
      }
    }
    
    // Clean up old delayed matches
    for (const [matchId, delayedInfo] of this.delayedMatches) {
      if (delayedInfo.checkCount > 20 || 
          (now - delayedInfo.originalStartTime) > (3 * 60 * 60 * 1000)) { // 3 hours old
        this.delayedMatches.delete(matchId);
      }
    }
    
    console.log(`[MatchScheduler] Cleanup completed at ${new Date().toISOString()} UTC`);
  }

  /**
   * Helper method to format date in UTC for consistent logging
   */
  formatUTC(date) {
    return new Date(date).toISOString() + ' UTC';
  }
}

export default MatchSchedulerService;

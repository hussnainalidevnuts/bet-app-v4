import NodeCache from "node-cache";
import { CustomError } from "../utils/customErrors.js";
import FixtureOptimizationService from "./fixture.service.js";
import axios from "axios";
import {
  classifyOdds,
  transformToBettingData,
} from "../utils/oddsClassification.js";

class LiveFixturesService {
  constructor(fixtureCache, sharedLiveOddsCache = null) {
    this.fixtureCache = fixtureCache;
    // Use shared cache if provided, otherwise create new one
    this.liveOddsCache = sharedLiveOddsCache || new NodeCache({ stdTTL: 180 }); // 3 minutes
    this.matchScheduler = null; // Will be set by app.js
  }

  // Method to set the match scheduler (called from app.js)
  setMatchScheduler(matchScheduler) {
    this.matchScheduler = matchScheduler;
    // Share the same cache instance to avoid inconsistency
    if (matchScheduler && matchScheduler.liveOddsCache) {
      this.liveOddsCache = matchScheduler.liveOddsCache;
      console.log('[LiveFixtures] Using shared cache from match scheduler');
    }
    console.log('[LiveFixtures] Match scheduler connected');
  }

  // Helper method to properly parse starting_at field (same as in bet.service.js)
  parseMatchStartTime(startingAt) {
    if (!startingAt) return null;

    // Handle different possible formats
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
        // Format: "2025-07-05 09:00:00" should be treated as UTC
        // Convert to ISO format and add Z for UTC
        let isoString = startingAt.replace(" ", "T");
        if (!isoString.includes("T")) {
          isoString = startingAt + "T00:00:00";
        }
        if (!isoString.endsWith("Z")) {
          isoString += "Z";
        }
        parsedDate = new Date(isoString);
      }
    } else if (startingAt instanceof Date) {
      // If it's already a Date object
      parsedDate = startingAt;
    } else {
      return null;
    }

    // Check if the date is valid
    if (isNaN(parsedDate.getTime())) {
      console.error(`[LiveFixtures] Invalid date created from: ${startingAt}`);
      return null;
    }

    return parsedDate;
  }

  // Helper method to validate player odds against lineups
  validatePlayerOdds(odds, matchData) {
    // Player validation temporarily disabled
    // if (!matchData || !Array.isArray(matchData.lineups)) {
    //   console.log(
    //     `[LiveFixtures] No lineup data available for player validation`
    //   );
    //   return odds; // Return all odds if no lineup data
    // }

    // // Extract player names from lineups for validation
    // const lineupPlayerNames = new Set();
    // matchData.lineups.forEach((lineup) => {
    //   if (lineup.player_name) {
    //     // Normalize player name for comparison (lowercase, trim spaces)
    //     lineupPlayerNames.add(lineup.player_name.toLowerCase().trim());
    //   }
    // });

    // if (lineupPlayerNames.size === 0) {
    //   // Log when no players are found in match lineups for validation
    //   console.log(
    //     `[LiveFixtures] No players found in lineups for match ${matchData.id}`
    //   );
    //   return odds; // Return all odds if no players in lineups
    // }

    // // Filter odds - validate player odds for market IDs 267 and 268
    // const validatedOdds = odds.filter((odd) => {
    //   // For player-related markets (267, 268), validate player is in lineups
    //   if (odd.market_id === 267 || odd.market_id === 268) {
    //     if (odd.name) {
    //       const playerName = odd.name.toLowerCase().trim();

    //       // Check exact match first
    //       if (lineupPlayerNames.has(playerName)) {
    //         return true;
    //       }

    //       // Check partial match (in case of name variations)
    //       for (const lineupPlayer of lineupPlayerNames) {
    //         // Check if odd name is contained in lineup name or vice versa
    //         if (
    //           lineupPlayer.includes(playerName) ||
    //           playerName.includes(lineupPlayer)
    //         ) {
    //           return true;
    //         }
    //       }

    //       // Player not found in lineups, exclude this odd
    //       console.log(
    //         `🚫 [LiveFixtures] Excluding player odd for "${odd.name}" - not in lineups for match ${matchData.id}`
    //       );
    //       return false;
    //     } else {
    //       // No player name in odd, exclude it
    //       console.log(
    //         `🚫 [LiveFixtures] Excluding player odd with no name for match ${matchData.id}`
    //       );
    //       return false;
    //     }
    //   }

    //   // For non-player markets, include the odd
    //   return true;
    // });

    // // Log player validation results showing how many odds were filtered
    // console.log(
    //   `[LiveFixtures] Player validation: ${odds.length} odds → ${validatedOdds.length} validated odds for match ${matchData.id}`
    // );
    return odds;
  }

  // Helper to group matches by league using the popular leagues cache
  bindLeaguesToMatches(matches) {
    const popularLeagues =
      FixtureOptimizationService.leagueCache.get("popular_leagues") || [];

    const leagueMap = new Map();
    for (const match of matches) {
      const leagueId = match.league_id;

      const foundLeague = popularLeagues.find(
        (l) => Number(l.id) === Number(leagueId)
      );
      let league;
      if (foundLeague) {
        league = {
          id: foundLeague.id,
          name: foundLeague.name,
          imageUrl: foundLeague.image_path || null,
          country:
            typeof foundLeague.country === "string"
              ? foundLeague.country
              : foundLeague.country?.name || null,
        };
      } else {
        // Try to get league info from the match itself if available
        if (match.league && match.league.name) {
          league = {
            id: match.league.id || leagueId,
            name: match.league.name,
            imageUrl: match.league.image_path || match.league.imageUrl || null,
            country: match.league.country?.name || match.league.country || null,
          };
        } else {
          league = {
            id: leagueId,
            name: `League ${leagueId}`,
            imageUrl: null,
            country: null,
          };
        }
      }

      if (!leagueMap.has(league.id)) {
        leagueMap.set(league.id, { league, matches: [] });
      }
      leagueMap.get(league.id).matches.push(match);
    }

    const result = Array.from(leagueMap.values());

    return result;
  }

  // Returns matches for today that have started (live)
  getLiveMatchesFromCache() {
    // First try to get matches from the optimized scheduler if available
    if (this.matchScheduler) {
      console.log('[LiveFixtures] Using optimized scheduler for live matches');
      return this.getOptimizedLiveMatches();
    }

    // Fallback to original method if scheduler not available
    console.log('[LiveFixtures] Using fallback method for live matches');
    return this.getOriginalLiveMatches();
  }

  // New optimized method using MatchScheduler
  async getOptimizedLiveMatches() {
    try {
      const liveMatches = [];
      const cacheKeys = this.matchScheduler.liveMatchesCache.keys();
      
      for (const matchId of cacheKeys) {
        const match = this.matchScheduler.liveMatchesCache.get(matchId);
        if (match && match.isLive) {
          // Get cached odds in unified format (no transformation needed)
          let cachedOdds = this.liveOddsCache.get(match.id);
          
          if (!cachedOdds || !cachedOdds.betting_data) {
            // Force refresh odds using scheduler's unified method
            cachedOdds = await this.matchScheduler.fetchAndCacheMatchOdds(match.id);
          }

          liveMatches.push({
            ...match,
            // Ensure we have the timing info from scheduler
            timing: match.timing || null,
            // Add cache metadata for debugging
            _cacheInfo: {
              hasOdds: !!cachedOdds,
              oddsSource: cachedOdds?.source || 'unknown',
              cachedAt: cachedOdds?.cached_at || null
            }
          });
        }
      }

      const grouped = this.bindLeaguesToMatches(liveMatches).map((group) => ({
        league: group.league,
        matches: group.matches.map((match) => {
          // Get cached odds for this match (already in unified format)
          const cachedOdds = this.liveOddsCache.get(match.id);
          console.log(
            `[getLiveMatchesFromCache] Match ${match.id} unified cache:`,
            {
              hasCache: !!cachedOdds,
              hasBettingData: !!(cachedOdds && cachedOdds.betting_data),
              bettingDataLength:
                cachedOdds && cachedOdds.betting_data
                  ? cachedOdds.betting_data.length
                  : 0,
              hasTimingInfo: !!match.timing,
              cacheSource: cachedOdds?.source || 'unknown'
            }
          );

          const mainOdds =
            cachedOdds && cachedOdds.betting_data
              ? this.extractMainOdds(cachedOdds.betting_data)
              : {};

          console.log(
            `[getLiveMatchesFromCache] Match ${match.id} main odds:`,
            mainOdds
          );

          return {
            ...match,
            odds: mainOdds, // Include the main 1X2 odds
            // Remove debug info from response
            _cacheInfo: undefined
          };
        }),
      }));

      console.log(
        `[LiveFixtures] Returning ${grouped.length} league groups with optimized live matches (unified cache)`
      );
      return grouped;

    } catch (error) {
      console.error('[LiveFixtures] Error in optimized live matches:', error);
      // Fallback to original method
      return this.getOriginalLiveMatches();
    }
  }

  // Original method (renamed for clarity)
  getOriginalLiveMatches() {
    const now = new Date();
    const cacheKeys = this.fixtureCache.keys();
    let liveMatches = [];
    let totalMatches = 0;
    let matchesChecked = 0;

    for (const key of cacheKeys) {
      if (key.startsWith("fixtures_")) {
        const cachedData = this.fixtureCache.get(key);
        let fixtures = [];
        if (Array.isArray(cachedData)) {
          fixtures = cachedData;
        } else if (cachedData && Array.isArray(cachedData.data)) {
          fixtures = cachedData.data;
        } else if (cachedData instanceof Map) {
          fixtures = Array.from(cachedData.values());
        } else {
          continue;
        }

        totalMatches += fixtures.length;

        for (const match of fixtures) {
          matchesChecked++;

          if (!match.starting_at) {
            continue;
          }

          // Use the proper timezone parsing helper
          const matchTime = this.parseMatchStartTime(match.starting_at);
          if (!matchTime) {
            continue;
          }

          // More flexible live match detection
          const matchEnd = new Date(matchTime.getTime() + 120 * 60 * 1000); // 120 minutes after start
          const timeSinceStart = now.getTime() - matchTime.getTime();
          const timeUntilEnd = matchEnd.getTime() - now.getTime();

          // Check multiple conditions for live matches
          const isStarted = matchTime <= now;
          const isNotEnded = now < matchEnd;
          const isLiveByTime = isStarted && isNotEnded;

          // Also check by state_id if available (2 = live, 3 = halftime, 4 = extra time)
          const isLiveByState =
            match.state_id && [2, 3, 4].includes(match.state_id);

          // Consider match live if either time-based or state-based criteria are met
          const isLive = isLiveByTime || isLiveByState;

          if (isLive) {
            liveMatches.push(match);
          }
        }
      }
    }

    const grouped = this.bindLeaguesToMatches(liveMatches).map((group) => ({
      league: group.league,
      matches: group.matches.map((match) => {
        // Get cached odds for this match
        const cachedOdds = this.liveOddsCache.get(match.id);
        console.log(
          `[getLiveMatchesFromCache] Match ${match.id} cached odds:`,
          {
            hasCache: !!cachedOdds,
            hasBettingData: !!(cachedOdds && cachedOdds.betting_data),
            bettingDataLength:
              cachedOdds && cachedOdds.betting_data
                ? cachedOdds.betting_data.length
                : 0,
          }
        );

        const mainOdds =
          cachedOdds && cachedOdds.betting_data
            ? this.extractMainOdds(cachedOdds.betting_data)
            : {};

        console.log(
          `[getLiveMatchesFromCache] Match ${match.id} main odds:`,
          mainOdds
        );

        return {
          ...match,
          odds: mainOdds, // Include the main 1X2 odds
        };
      }),
    }));

    // Log the number of league groups containing live matches
    console.log(
      `[LiveFixtures] Returning ${grouped.length} league groups with live matches`
    );
    return grouped;
  }

  // Fetch and update odds for all live matches
  async updateAllLiveOdds() {
    console.log('[LiveFixtures] Starting unified odds update process');
    
    let totalLiveMatches = 0;
    
    // Count live matches from scheduler
    if (this.matchScheduler) {
      const schedulerMatchIds = this.matchScheduler.liveMatchesCache.keys();
      totalLiveMatches = schedulerMatchIds.length;
      
      // Early return if no live matches to avoid unnecessary API calls
      if (totalLiveMatches === 0) {
        console.log('[LiveFixtures] No live matches found in scheduler - skipping odds update to save API calls');
        return;
      }
      
      console.log(`[LiveFixtures] Found ${totalLiveMatches} live matches in scheduler - proceeding with odds update`);
      
      // Use the optimized scheduler for odds updating
      await this.updateSchedulerOdds();
      console.log('[LiveFixtures] Unified odds update completed');
      return;
    }
    
    // Fallback to original method only if scheduler is not available
    console.log('[LiveFixtures] No scheduler available - using fallback method');
    const fallbackMatches = this.getOriginalLiveMatches();
    const fallbackMatchCount = fallbackMatches.reduce((count, group) => count + group.matches.length, 0);
    
    if (fallbackMatchCount === 0) {
      console.log('[LiveFixtures] No live matches found in fallback - skipping odds update to save API calls');
      return;
    }
    
    console.log(`[LiveFixtures] Found ${fallbackMatchCount} live matches in fallback - proceeding with odds update`);
    await this.updateFallbackMatchesOdds(fallbackMatches);
    console.log('[LiveFixtures] Fallback odds update completed');
  }

  // Update odds for matches in the scheduler using unified format
  async updateSchedulerOdds() {
    if (!this.matchScheduler) return;

    const liveMatchIds = this.matchScheduler.liveMatchesCache.keys();
    
    // Early return if no matches to avoid unnecessary processing
    if (liveMatchIds.length === 0) {
      console.log('[LiveFixtures] No scheduler matches found - skipping scheduler odds update');
      return;
    }
    
    console.log(`[LiveFixtures] Updating unified odds for ${liveMatchIds.length} scheduler matches`);

    let successfulUpdates = 0;
    for (const matchId of liveMatchIds) {
      try {
        // Force refresh odds using the unified method
        const updatedOdds = await this.matchScheduler.fetchAndCacheMatchOdds(matchId);
        if (updatedOdds && updatedOdds.betting_data) {
          successfulUpdates++;
          console.log(`[LiveFixtures] Updated unified odds for match ${matchId} - ${updatedOdds.betting_data.length} sections`);
        }
      } catch (error) {
        console.error(`[LiveFixtures] Error updating unified odds for match ${matchId}:`, error);
      }
    }

    console.log(`[LiveFixtures] Successfully updated ${successfulUpdates}/${liveMatchIds.length} scheduler matches with unified format`);
  }

  // Update odds for fallback matches (when scheduler is not available or as backup)
  async updateFallbackMatchesOdds(liveMatches) {
    // Early return if no fallback matches to avoid unnecessary API calls
    if (!liveMatches || liveMatches.length === 0) {
      console.log('[LiveFixtures] No fallback matches found - skipping fallback odds update');
      return;
    }
    
    const totalFallbackMatches = liveMatches.reduce((count, group) => count + group.matches.length, 0);
    if (totalFallbackMatches === 0) {
      console.log('[LiveFixtures] No matches in fallback groups - skipping fallback odds update');
      return;
    }
    
    console.log(`[LiveFixtures] Processing ${totalFallbackMatches} fallback matches for odds update`);
    
    const apiToken = process.env.SPORTSMONKS_API_KEY;

    // Define the same allowed market IDs as in fixture.service.js
    const allowedMarketIds = [
      1, 2, 267, 268, 29, 90, 93, 95, 124, 125, 10, 14, 18, 19, 44, 4, 5, 81,
      37, 11, 97, 13, 86, 80, 60, 67, 68, 69,
    ];

    if (!apiToken) {
      console.error("❌ SPORTSMONKS_API_KEY is not set");
      return;
    }

    let totalMatches = 0;
    let successfulUpdates = 0;

    for (const group of liveMatches) {
      for (const match of group.matches) {
        totalMatches++;
        
        // Skip if we already have fresh odds from scheduler
        const existingOdds = this.liveOddsCache.get(match.id);
        if (existingOdds && existingOdds.source === 'match_scheduler' && 
            existingOdds.cached_at && (Date.now() - existingOdds.cached_at) < 180000) { // 3 minutes
          console.log(`[LiveFixtures] Skipping match ${match.id} - has fresh scheduler odds`);
          continue;
        }

        try {
          // Use the fixture endpoint with inplayOdds included
          const url = `https://api.sportmonks.com/v3/football/fixtures/${match.id}?api_token=${apiToken}&include=inplayOdds&filters=bookmakers:2`;

          const response = await axios.get(url);
          const allOdds = response.data?.data?.inplayodds || [];
          
          // Filter odds by allowed market IDs
          let filteredOdds = allOdds.filter((odd) =>
            allowedMarketIds.includes(odd.market_id)
          );

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
            odds_by_market[odd.market_id].market_description =
              odd.market_description;
          }
          const classified = classifyOdds({ odds_by_market });
          const betting_data = transformToBettingData(classified, match);

          // Store in unified format
          const result = {
            betting_data: betting_data,
            odds_classification: classified,
            cached_at: Date.now(),
            source: 'fallback_update'
          };

          // Cache the result in unified format
          this.liveOddsCache.set(match.id, result);
          successfulUpdates++;

          console.log(
            `[LiveFixtures] Updated fallback odds for match ${match.id} with ${betting_data.length} betting data sections`
          );
        } catch (err) {
          console.error(
            `❌ Failed to update fallback odds for match ${match.id}:`,
            err.message
          );
        }
      }
    }

    console.log(
      `[LiveFixtures] Updated fallback odds for ${successfulUpdates}/${totalMatches} matches`
    );
  }

  // Get latest betting_data for a match (from cache)
  getLiveOdds(matchId) {
    // Return betting_data from cached result
    const cached = this.liveOddsCache.get(matchId);
    if (cached && cached.betting_data) {
      return cached.betting_data;
    }
    return [];
  }

  // Get latest odds classification for a match (from cache)
  getLiveOddsClassification(matchId) {
    // Return odds_classification from cached result
    const cached = this.liveOddsCache.get(matchId);
    if (cached && cached.odds_classification) {
      return cached.odds_classification;
    }
    return {
      categories: [{ id: "all", label: "All", odds_count: 0 }],
      classified_odds: {},
      stats: { total_categories: 0, total_odds: 0 },
    };
  }

  // Ensure we have live odds for a specific match
  async ensureLiveOdds(matchId) {
    // Check if we already have odds in unified cache
    let odds = this.liveOddsCache.get(matchId);
    console.log(`[ensureLiveOdds] Unified cache check for match ${matchId}:`, {
      hasCache: !!odds,
      cacheType: typeof odds,
      cacheSource: odds?.source || 'unknown',
      hasBettingData: !!(odds && odds.betting_data),
      cacheAge: odds?.cached_at ? Date.now() - odds.cached_at : null,
    });

    if (odds && odds.betting_data && odds.betting_data.length > 0) {
      console.log(
        `[ensureLiveOdds] Returning unified cached odds for match ${matchId} from ${odds.source}`
      );
      return odds;
    }

    // If not in cache or stale, fetch using scheduler if available
    if (this.matchScheduler) {
      console.log(`[ensureLiveOdds] Fetching fresh odds via scheduler for match ${matchId}`);
      const freshOdds = await this.matchScheduler.fetchAndCacheMatchOdds(matchId);
      if (freshOdds && freshOdds.betting_data) {
        return freshOdds;
      }
    }

    // Fallback to direct API call with unified format
    console.log(`[ensureLiveOdds] Fetching fresh odds via fallback API for match ${matchId}`);
    return await this.fetchOddsDirectly(matchId);
  }

  // Direct API fetch with unified format (fallback method)
  async fetchOddsDirectly(matchId) {
    const apiToken = process.env.SPORTSMONKS_API_KEY;
    if (!apiToken) {
      throw new CustomError("API key not configured", 500, "API_KEY_MISSING");
    }

    // Define the same allowed market IDs as in fixture.service.js
    const allowedMarketIds = [
      1, 2, 267, 268, 29, 90, 93, 95, 124, 125, 10, 14, 18, 19, 44, 4, 5, 81,
      37, 11, 97, 13, 86, 80, 60, 67, 68, 69,
    ];

    try {
      const url = `https://api.sportmonks.com/v3/football/fixtures/${matchId}?api_token=${apiToken}&include=inplayOdds&filters=bookmakers:2`;
      const response = await axios.get(url);
      const allOddsData = response.data?.data?.inplayodds || [];

      // Filter odds by allowed market IDs
      let oddsData = allOddsData.filter((odd) =>
        allowedMarketIds.includes(odd.market_id)
      );

      // Get match data for team names
      let matchData = await this.getMatchDataFromCache(matchId);

      // Group odds by market for classification
      const odds_by_market = {};
      for (const odd of oddsData) {
        if (!odd.market_id) continue;
        if (!odds_by_market[odd.market_id]) {
          odds_by_market[odd.market_id] = {
            market_id: odd.market_id,
            market_description: odd.market_description,
            odds: [],
          };
        }
        odds_by_market[odd.market_id].odds.push({
          ...odd,
          id: odd.id,
          value: odd.value,
          label: odd.label,
          name: odd.name || odd.label,
          suspended: odd.suspended,
          stopped: odd.stopped,
        });
        odds_by_market[odd.market_id].market_description = odd.market_description;
      }

      const classified = classifyOdds({ odds_by_market });
      const betting_data = transformToBettingData(classified, matchData);

      // Store in unified format
      const result = {
        betting_data: betting_data,
        odds_classification: classified,
        cached_at: Date.now(),
        source: 'direct_fetch'
      };

      console.log(
        `[ensureLiveOdds] Fetched and cached ${result.betting_data.length} sections for match ${matchId}`
      );

      // Cache the result in unified format
      this.liveOddsCache.set(matchId, result);
      return result;
    } catch (err) {
      console.error("Error fetching live odds directly:", err);
      throw new CustomError(
        "Failed to fetch live odds",
        500,
        "LIVE_ODDS_FETCH_ERROR"
      );
    }
  }

  // Helper to get match data from cache
  async getMatchDataFromCache(matchId) {
    // First try scheduler cache
    if (this.matchScheduler) {
      const matchData = await this.matchScheduler.getMatchDetailsFromCache(matchId);
      if (matchData) return matchData;
    }

    // Fallback to fixture cache
    const cacheKeys = this.fixtureCache.keys();
    for (const key of cacheKeys) {
      if (key.startsWith("fixtures_")) {
        const cachedData = this.fixtureCache.get(key);
        let fixtures = [];
        if (Array.isArray(cachedData)) {
          fixtures = cachedData;
        } else if (cachedData && Array.isArray(cachedData.data)) {
          fixtures = cachedData.data;
        } else if (cachedData instanceof Map) {
          fixtures = Array.from(cachedData.values());
        } else {
          continue;
        }

        const matchData = fixtures.find(
          (m) => m.id == matchId || m.id === parseInt(matchId)
        );
        if (matchData) return matchData;
      }
    }
    return null;
  }

  // Extract only 1, X, 2 odds for inplay display
  extractMainOdds(bettingData) {
    if (!Array.isArray(bettingData)) {
      console.log(
        `[extractMainOdds] bettingData is not an array:`,
        typeof bettingData
      );
      return {};
    }

    console.log(
      `[extractMainOdds] Processing ${bettingData.length} betting data sections`
    );
    console.log(
      `[extractMainOdds] Section titles:`,
      bettingData.map((section) => section.title)
    );

    // Find the main market (1x2) section in betting data
    const mainMarketSection = bettingData.find(
      (section) =>
        section.title === "Match Result" ||
        section.title === "1X2" ||
        section.title === "Fulltime Result" || // Add this variation
        section.market_id === 1
    );

    if (!mainMarketSection || !mainMarketSection.options) {
      console.log(
        `[extractMainOdds] No main market section found in betting data`
      );
      console.log(
        `[extractMainOdds] Available sections:`,
        bettingData.map((s) => ({
          title: s.title,
          market_id: s.market_id,
          hasOptions: !!s.options,
        }))
      );
      return {};
    }

    console.log(`[extractMainOdds] Found main market section:`, {
      title: mainMarketSection.title,
      market_id: mainMarketSection.market_id,
      optionsCount: mainMarketSection.options.length,
    });

    const result = {};

    // Extract home, draw, away odds with suspended status
    mainMarketSection.options.forEach((option) => {
      const label = option.label?.toLowerCase();
      const name = option.name?.toLowerCase();

      console.log(`[extractMainOdds] Processing option:`, {
        label,
        name,
        value: option.value,
        id: option.id,
      });

      if (
        label === "home" ||
        label === "1" ||
        name === "home" ||
        name === "1"
      ) {
        result.home = {
          value: option.value,
          oddId: option.id,
          suspended: option.suspended || false,
        };
      } else if (
        label === "draw" ||
        label === "x" ||
        name === "draw" ||
        name === "x"
      ) {
        result.draw = {
          value: option.value,
          oddId: option.id,
          suspended: option.suspended || false,
        };
      } else if (
        label === "away" ||
        label === "2" ||
        name === "away" ||
        name === "2"
      ) {
        result.away = {
          value: option.value,
          oddId: option.id,
          suspended: option.suspended || false,
        };
      }
    });

    console.log(
      `[extractMainOdds] Extracted odds with suspended status:`,
      result
    );
    return result;
  }

  // Returns a map of betting_data for all live matches: { [matchId]: betting_data }
  getAllLiveOddsMap() {
    const now = new Date();
    const cacheKeys = this.fixtureCache.keys();
    let liveMatchIds = [];

    for (const key of cacheKeys) {
      if (key.startsWith("fixtures_")) {
        const cachedData = this.fixtureCache.get(key);
        let fixtures = [];
        if (Array.isArray(cachedData)) {
          fixtures = cachedData;
        } else if (cachedData && Array.isArray(cachedData.data)) {
          fixtures = cachedData.data;
        } else if (cachedData instanceof Map) {
          fixtures = Array.from(cachedData.values());
        } else {
          continue;
        }

        for (const match of fixtures) {
          if (!match.starting_at) continue;

          // Use the proper timezone parsing helper
          const matchTime = this.parseMatchStartTime(match.starting_at);
          if (!matchTime) {
            continue;
          }

          const matchEnd = new Date(matchTime.getTime() + 120 * 60 * 1000);

          // Check multiple conditions for live matches (same as getLiveMatchesFromCache)
          const isStarted = matchTime <= now;
          const isNotEnded = now < matchEnd;
          const isLiveByTime = isStarted && isNotEnded;

          // Also check by state_id if available (2 = live, 3 = halftime, 4 = extra time)
          const isLiveByState =
            match.state_id && [2, 3, 4].includes(match.state_id);

          // Consider match live if either time-based or state-based criteria are met
          const isLive = isLiveByTime || isLiveByState;

          if (isLive) {
            liveMatchIds.push(match.id);
          }
        }
      }
    }

    // Build the betting_data map
    const bettingDataMap = {};
    for (const matchId of liveMatchIds) {
      const cached = this.liveOddsCache.get(matchId);
      if (cached) {
        bettingDataMap[matchId] = {
          betting_data: cached.betting_data || [],
          odds_classification: cached.odds_classification || {
            categories: [{ id: "all", label: "All", odds_count: 0 }],
            classified_odds: {},
            stats: { total_categories: 0, total_odds: 0 },
          },
        };
      } else {
        bettingDataMap[matchId] = {
          betting_data: [],
          odds_classification: {
            categories: [{ id: "all", label: "All", odds_count: 0 }],
            classified_odds: {},
            stats: { total_categories: 0, total_odds: 0 },
          },
        };
      }
    }

    console.log(
      `[LiveFixtures] getAllLiveOddsMap found ${liveMatchIds.length} live matches`
    );
    return bettingDataMap;
  }

  // Debug method to get all matches and their states

  // Check if a specific match is live
  isMatchLive(matchId) {
    const now = new Date();
    const cacheKeys = this.fixtureCache.keys();

    for (const key of cacheKeys) {
      if (key.startsWith("fixtures_")) {
        const cachedData = this.fixtureCache.get(key);
        let fixtures = [];
        if (Array.isArray(cachedData)) {
          fixtures = cachedData;
        } else if (cachedData && Array.isArray(cachedData.data)) {
          fixtures = cachedData.data;
        } else if (cachedData instanceof Map) {
          fixtures = Array.from(cachedData.values());
        } else {
          continue;
        }

        const match = fixtures.find(
          (m) => m.id == matchId || m.id === parseInt(matchId)
        );
        if (match) {
          if (!match.starting_at) {
            return false;
          }

          const matchTime = this.parseMatchStartTime(match.starting_at);
          if (!matchTime) {
            return false;
          }

          const matchEnd = new Date(matchTime.getTime() + 120 * 60 * 1000); // 120 minutes after start

          // Check multiple conditions for live matches
          const isStarted = matchTime <= now;
          const isNotEnded = now < matchEnd;
          const isLiveByTime = isStarted && isNotEnded;

          // Also check by state_id if available (2 = live, 3 = halftime, 4 = extra time)
          const isLiveByState =
            match.state_id && [2, 3, 4].includes(match.state_id);

          // Consider match live if either time-based or state-based criteria are met
          return isLiveByTime || isLiveByState;
        }
      }
    }

    return false;
  }
}

export default LiveFixturesService;

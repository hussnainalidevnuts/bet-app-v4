import NodeCache from "node-cache";
import { CustomError } from "../utils/customErrors.js";
import FixtureOptimizationService from "./fixture.service.js";
import axios from "axios";
import { classifyOdds, transformToBettingData } from "../utils/oddsClassification.js";

class LiveFixturesService {
  constructor(fixtureCache) {
    this.fixtureCache = fixtureCache;
    this.liveOddsCache = new NodeCache({ stdTTL: 180 }); // 3 minutes
  }

  // Helper to group matches by league using the popular leagues cache
  bindLeaguesToMatches(matches) {
    const popularLeagues = FixtureOptimizationService.leagueCache.get("popular_leagues") || [];
    const leagueMap = new Map();
    for (const match of matches) {
      const leagueId = match.league_id;
      const foundLeague = popularLeagues.find(l => Number(l.id) === Number(leagueId));
      let league;
      if (foundLeague) {
        league = {
          id: foundLeague.id,
          name: foundLeague.name,
          imageUrl: foundLeague.image_path || null,
          country: typeof foundLeague.country === "string" ? foundLeague.country : foundLeague.country?.name || null,
        };
      } else {
        league = {
          id: leagueId,
          name: `League ${leagueId}`,
          imageUrl: null,
          country: null,
        };
      }
      if (!leagueMap.has(league.id)) {
        leagueMap.set(league.id, { league, matches: [] });
      }
      leagueMap.get(league.id).matches.push(match);
    }
    return Array.from(leagueMap.values());
  }

  // Returns matches for today that have started (live)
  getLiveMatchesFromCache() {
    const now = new Date();
    const cacheKeys = this.fixtureCache.keys();
    let liveMatches = [];
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
          if (!match.starting_at) {
            continue;
          }
          // Parse the starting_at field as UTC
          let matchTime;
          if (match.starting_at.includes('T')) {
            matchTime = new Date(match.starting_at.endsWith('Z') ? match.starting_at : match.starting_at + 'Z');
          } else {
            matchTime = new Date(match.starting_at.replace(' ', 'T') + 'Z');
          }
          const matchEnd = new Date(matchTime.getTime() + 120 * 60 * 1000); // 120 minutes after start
          if (matchTime <= now && now < matchEnd) {
            liveMatches.push(match);
          }
        }
      }
    }
    console.log(`[LiveFixtures] Returning ${liveMatches.length} live matches at ${now.toISOString()}`);
    const grouped = this.bindLeaguesToMatches(liveMatches).map(group => ({
      league: group.league,
      matches: group.matches.map(match => ({
        ...match,
        odds: [], 
      })),
    }));
    return grouped;
  }

  // Fetch and update odds for all live matches
  async updateAllLiveOdds() {
    console.log("🚀 updateAllLiveOdds function called");
    const liveMatches = this.getLiveMatchesFromCache();
    const apiToken = process.env.SPORTSMONKS_API_KEY;
    
    console.log(`🔄 Updating odds for ${liveMatches.length} live match groups`);
    console.log(`🔑 API Token available: ${apiToken ? 'Yes' : 'No'}`);
    
    if (!apiToken) {
      console.error("❌ SPORTSMONKS_API_KEY is not set");
      return;
    }
    
    let totalMatches = 0;
    let successfulUpdates = 0;
    
    for (const group of liveMatches) {
      console.log(`📋 Processing group: ${group.league?.name || 'Unknown League'}`);
      for (const match of group.matches) {
        totalMatches++;
        try {
          // Use the inplay odds endpoint
          const url = `https://api.sportmonks.com/v3/football/odds/inplay/fixtures/${match.id}?api_token=${apiToken}&include=`;
          
          
          const response = await axios.get(url);
          const odds = response.data?.data || [];
          
          // Group odds by market for classification
          const odds_by_market = {};
          for (const odd of odds) {
            if (!odd.market_id) continue;
            if (!odds_by_market[odd.market_id]) odds_by_market[odd.market_id] = { market_id: odd.market_id, market_description: odd.market_description, odds: [] };
            odds_by_market[odd.market_id].odds.push(odd);
            odds_by_market[odd.market_id].market_description = odd.market_description;
          }
          const classified = classifyOdds({ odds_by_market });
          const betting_data = transformToBettingData(classified, match);
          // Cache only betting_data
          this.liveOddsCache.set(match.id, betting_data);
          console.log(`✅ Updated betting_data for match ${match.id}: ${betting_data.length} betting_data`);
          successfulUpdates++;
        } catch (err) {
          console.error(`❌ Failed to update betting_data for match ${match.id}:`, err.message);
          if (err.response) {
            console.error(`📊 Error response:`, err.response.data);
          }
        }
      }
    }
    
    console.log(`🎯 Total matches processed: ${totalMatches}, successful updates: ${successfulUpdates}`);
  }

  // Get latest betting_data for a match (from cache)
  getLiveOdds(matchId) {
    // Now returns betting_data array
    return this.liveOddsCache.get(matchId) || [];
  }

  // Extract only 1, X, 2 odds for inplay display
  extractMainOdds(odds) {
    if (!Array.isArray(odds) || odds.length === 0) {
      return {};
    }
    const homeOdd = odds.find(o => o.label?.toLowerCase() === "home" || o.label === "1");
    const drawOdd = odds.find(o => o.label?.toLowerCase() === "draw" || o.label === "X");
    const awayOdd = odds.find(o => o.label?.toLowerCase() === "away" || o.label === "2");
    const result = {
      home: homeOdd ? { value: homeOdd.value, oddId: homeOdd.id } : undefined,
      draw: drawOdd ? { value: drawOdd.value, oddId: drawOdd.id } : undefined,
      away: awayOdd ? { value: awayOdd.value, oddId: awayOdd.id } : undefined,
    };
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
          let matchTime;
          if (match.starting_at.includes('T')) {
            matchTime = new Date(match.starting_at.endsWith('Z') ? match.starting_at : match.starting_at + 'Z');
          } else {
            matchTime = new Date(match.starting_at.replace(' ', 'T') + 'Z');
          }
          const matchEnd = new Date(matchTime.getTime() + 120 * 60 * 1000);
          if (matchTime <= now && now < matchEnd) {
            liveMatchIds.push(match.id);
          }
        }
      }
    }
    // Build the betting_data map
    const bettingDataMap = {};
    for (const matchId of liveMatchIds) {
      bettingDataMap[matchId] = this.liveOddsCache.get(matchId) || [];
    }
    return bettingDataMap;
  }
}

export default LiveFixturesService;
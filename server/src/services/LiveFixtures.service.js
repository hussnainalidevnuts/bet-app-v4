import NodeCache from "node-cache";
import { CustomError } from "../utils/customErrors.js";
import FixtureOptimizationService from "./fixture.service.js";

class LiveFixturesService {
  constructor(fixtureCache) {
    this.fixtureCache = fixtureCache;
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
    const todayStr = now.toISOString().split("T")[0];
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
        }
        for (const match of fixtures) {
          if (!match.starting_at) continue;
          const matchDate = match.starting_at.split("T")[0];
          const matchTime = new Date(match.starting_at);
          if (
            matchDate === todayStr &&
            matchTime <= now
          ) {
            liveMatches.push(match);
          }
        }
      }
    }
    // Group by league using the helper, but ensure the output matches the required structure
    const grouped = this.bindLeaguesToMatches(liveMatches).map(group => ({
      league: group.league,
      matches: group.matches.map(match => ({
        ...match,
        odds: [], // odds should be empty array
      })),
    }));
    return grouped;
  }
}

export default LiveFixturesService; 
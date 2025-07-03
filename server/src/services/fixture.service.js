import NodeCache from "node-cache";
import sportsMonksService from "./sportsMonks.service.js";
import { CustomError } from "../utils/customErrors.js";
import {
  classifyOdds,
  transformToBettingData,
} from "../utils/oddsClassification.js";
import cron from "node-cron";
import LiveFixturesService from "./LiveFixtures.service.js";

class FixtureOptimizationService {
  constructor() {
    // INFO: Cache for 24 hours + 20 minutes (87200 seconds)
    this.liveCache = new NodeCache({ stdTTL: 600 });
    this.fixtureCache = new NodeCache({ stdTTL: 87200 }); // 24h + 20min
    this.leagueCache = new NodeCache({ stdTTL: 87200 }); // 24h + 20min
    this.upcomingMatchesCache = new NodeCache({ stdTTL: 6 * 60 * 60 }); // 6 hours TTL

    // INFO: Track API calls for rate limiting
    this.apiCallCount = 0;
    this.lastResetTime = Date.now();
    this.maxCallsPerHour = 1000; // Adjust based on your plan
    // On server start, fetch and cache all data
    this.refreshAllData();

    // Schedule daily refresh at 12am (midnight)
    cron.schedule("0 0 * * *", () => {
      this.refreshAllData();
    });

    this.liveFixturesService = new LiveFixturesService(this.fixtureCache);
  }

  async getOptimizedFixtures() {
    const today = new Date();
    const startDate = today.toISOString().split("T")[0];
    const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const cacheKey = `fixtures_next7days_${startDate}_${endDate}`;

    // Check cache first
    const cached = this.fixtureCache.get(cacheKey);
    if (cached) {
      console.log("📦 Returning cached fixtures data");
      // If cached is a Map, return as is
      return cached;
    }

    this.checkRateLimit();

    let allFixtures = [];
    let pageUrl = `/football/fixtures/between/${startDate}/${endDate}`;
    let page = 1;
    try {
      while (pageUrl) {
        let params = {
          include: "odds;participants",
          per_page: 50,
          page: page,
        };
        const response = await sportsMonksService.client.get(pageUrl, {
          params,
        });
        const data = response.data?.data || [];
        allFixtures = allFixtures.concat(data);
        const pagination = response.data?.pagination;
        if (pagination && pagination.has_more && pagination.next_page) {
          page++;
        } else {
          pageUrl = null;
        }
      }
      // Transform and cache as a Map
      const transformedArr = this.transformFixturesData(allFixtures);
      const transformed = new Map();
      for (const fixture of transformedArr) {
        transformed.set(fixture.id, fixture);
      }
      this.fixtureCache.set(cacheKey, transformed);
      return transformed;
    } catch (error) {
      console.error("Error in getOptimizedFixtures:", error);
      throw error;
    }
  }

  transformFixturesData(fixtures) {
    return fixtures.map((fixture) => {
      // Extract only essential data
      const transformed = {
        id: fixture.id,
        name: fixture.name,
        starting_at: fixture.starting_at,
        state_id: fixture.state_id,
        league_id: fixture.league_id,
        participants:
          fixture.participants?.map((p) => ({
            id: p.id,
            name: p.name,
            image_path: p.image_path,
          })) || [],
        odds: Array.isArray(fixture.odds)
          ? fixture.odds.map((odd) => ({
              id: odd.id,
              fixture_id: odd.fixture_id,
              label: odd.label,
              value: parseFloat(odd.value),
              name: odd.name,
              market_id: odd.market_id,
              market_description: odd.market_description,
              winning: odd.winning,
              probability: odd.probability,
            }))
          : [],
      };
      return transformed;
    });
  }


  extractMainOdds(odds) {
    if (!odds || odds.length === 0) return null;

    const oddsMap = {
      home: null,
      draw: null,
      away: null,
      over25: null,
      under25: null,
      btts_yes: null,
      btts_no: null,
    };

    // Extract main market odds efficiently
    odds.forEach((odd) => {
      const marketId = odd.market_id;
      const label = odd.label?.toLowerCase();
      const value = parseFloat(odd.value);

      switch (marketId) {
        case 1: // 1X2
          if (label === "home" || label === "1") oddsMap.home = value;
          if (label === "draw" || label === "x") oddsMap.draw = value;
          if (label === "away" || label === "2") oddsMap.away = value;
          break;
        case 2: // Over/Under 2.5
          if (label?.includes("over")) oddsMap.over25 = value;
          if (label?.includes("under")) oddsMap.under25 = value;
          break;
        case 3: // Both Teams to Score
          if (label?.includes("yes")) oddsMap.btts_yes = value;
          if (label?.includes("no")) oddsMap.btts_no = value;
          break;
      }
    });

    return oddsMap;
  }

  async getPopularLeagues() {
    const cacheKey = `popular_leagues`;
    const cached = this.leagueCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Make API call to get actual leagues
      console.log("🔍 Fetching leagues from SportsMonks API...");

      const response = await sportsMonksService.getLeagues();
      this.apiCallCount++;
      console.log(`📊 API Calls made: ${this.apiCallCount}`);

      if (response && response.length > 0) {
        // Define popular league names for prioritization
        const popularLeagueNames = [
          "Premier League",
          "Champions League",
          "La Liga",
          "Serie A",
          "Bundesliga",
          "Ligue 1",
          "Europa League",
          "World Cup",
          "European Championship",
          "Copa America",
          "NBA",
          "NHL",
        ];

        // Sort leagues by popularity (known popular leagues first)
        const sortedLeagues = response.sort((a, b) => {
          const aPopular = popularLeagueNames.some((name) =>
            a.name.toLowerCase().includes(name.toLowerCase())
          );
          const bPopular = popularLeagueNames.some((name) =>
            b.name.toLowerCase().includes(name.toLowerCase())
          );

          if (aPopular && !bPopular) return -1;
          if (!aPopular && bPopular) return 1;
          return 0;
        });

        // Take the specified limit (default 10)
        const popularLeagues = sortedLeagues;
        this.leagueCache.set(cacheKey, popularLeagues);
        console.log(`✅ Fetched ${popularLeagues.length} leagues from API `);
        return popularLeagues;
      } else {
        throw new Error("No leagues found from API");
      }
    } catch (error) {
      console.error("❌ Error fetching leagues from API:", error);

      // Fallback to hardcoded popular leagues if API fails
      console.log("🔄 Falling back to hardcoded leagues...");

      // this.leagueCache.set(cacheKey, fallbackLeagues);
      return {};
    }
  }

  async getTodaysFixtures() {
    // Always use the main fixtures cache (no filters)
    const fixturesMap = await this.getOptimizedFixtures();
    return this.getAllFixturesArrayFromMap(fixturesMap);
  }

  async getUpcomingFixtures() {
    // Always use the main fixtures cache (no filters)
    let fixturesMap = await this.getOptimizedFixtures();
    let fixtures = this.getAllFixturesArrayFromMap(fixturesMap);

    // Optionally, filter to only fixtures within [today, 10 days later] if needed for display
    const today = new Date();
    const filterEndDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000); // 10 days later
    fixtures = fixtures.filter((fixture) => {
      const fixtureDate = new Date(fixture.starting_at);
      return fixtureDate >= today && fixtureDate <= filterEndDate;
    });

    // Fetch all leagues from cache (now using 'popular_leagues')
    console.log("League cache keys:", this.leagueCache.keys());
    
    const leagues = this.leagueCache.get("popular_leagues") || [];

    // Attach league object and main odds to each fixture
    fixtures.forEach((fixture) => {
      const leagueId = Number(fixture.league_id);
      const foundLeague = leagues.find((l) => Number(l.id) === leagueId);
      fixture.league = foundLeague
        ? {
            id: foundLeague.id,
            name: foundLeague.name,
            imageUrl: foundLeague.image_path || null,
            icon: foundLeague.image_path || "⚽",
            country: typeof foundLeague.country === "string" ? foundLeague.country : foundLeague.country?.name || null,
          }
        : {
            id: leagueId,
            name: "Unknown League",
            imageUrl: null,
            icon: "⚽",
            country: null,
          };
      // Attach only main odds in expected format
      fixture.odds = this.extractMainOddsObject(fixture.odds);
    });

    // Group fixtures by league name
    const groupedByLeague = {};
    fixtures.forEach((fixture) => {
      const leagueName = fixture.league?.name || "Unknown League";
      if (!groupedByLeague[leagueName]) {
        groupedByLeague[leagueName] = [];
      }
      groupedByLeague[leagueName].push(this.transformMatchOdds(fixture));
    });

    return groupedByLeague;
  }

  // Get optimized homepage data
  async getHomepageData() {
    const cacheKey = "homepage_data";
    const cached = this.fixtureCache.get(cacheKey);

    if (cached) {
      console.log("📦 Returning cached homepage data");
      return cached;
    }

    try {
      console.log("🏠 Fetching fresh homepage data...");

      // Get date ranges
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const footballDailyEndDate = new Date(
        today.getTime() + 20 * 24 * 60 * 60 * 1000
      );
      const footballDailyEndStr = footballDailyEndDate
        .toISOString()
        .split("T")[0];

      // Get leagues for better league name resolution
      const allLeagues = await this.getPopularLeagues();

      // Check if we have cached fixture data that covers our date range
      let allFixtures = [];
      let usedCache = false;

      // Generate cache key for the fixture data we need (20 days, all leagues)
      const fixturesCacheKey = `fixtures_${JSON.stringify({
        page: 1,
        limit: 300,
        leagues: [],
        dateFrom: todayStr,
        dateTo: footballDailyEndStr,
        states: [1],
        includeOdds: true,
        per_page: 50,
      })}`;

      // Check if we have cached fixture data
      const cachedFixtures = this.fixtureCache.get(fixturesCacheKey);

      if (cachedFixtures && (Array.isArray(cachedFixtures) || cachedFixtures instanceof Map)) {
        console.log("📦 Using cached fixture data for homepage filtering");
        allFixtures = this.getAllFixturesArrayFromMap(cachedFixtures);
        usedCache = true;
      } else {
        console.log("🔍 No suitable cached fixtures found, making API call...");

        // Make a single API call for all fixtures we need (20 days, all leagues)
        const fixturesMap = await this.getOptimizedFixtures().catch(() => new Map());
        allFixtures = this.getAllFixturesArrayFromMap(fixturesMap);
      }

      // Now filter the fixtures for homepage needs
      const today10Days = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);
      const topPicksEndStr = today10Days.toISOString().split("T")[0];

      // Filter fixtures for top picks (first 10 days)
      let topPicksFixtures = allFixtures.filter((fixture) => {
        const fixtureDate = new Date(fixture.starting_at);
        return fixtureDate <= today10Days;
      });

      // All fixtures are already suitable for football daily (20 days)
      let footballDailyFixtures = allFixtures;

      // 1. Generate Top Picks (8-10 best matches) - transform odds and filter out matches without odds
      let topPicks = this.selectTopPicks(topPicksFixtures, 12)
        .map((match) => {
          // Always attach league info from allLeagues if available
          let league = this.getLeagueById(match.league_id);
          if (!league || !league.name || !league.imageUrl) {
            // fallback: try to get from allLeagues array
            const fallback = allLeagues.find((l) => l.id === match.league_id);
            if (fallback) {
              league = {
                id: fallback.id,
                name: fallback.name,
                imageUrl: fallback.image_path || null,
                country:
                  typeof fallback.country === "string"
                    ? fallback.country
                    : fallback.country?.name || null,
              };
            }
          }
          // Only keep main odds for homepage
          return { ...this.transformMatchOdds(match), league, odds: this.extractMainOddsObject(match.odds) };
        })
        .filter((match) => match.odds && Object.keys(match.odds).length > 0);

      // 2. Generate Football Daily (matches from all leagues for 20 days) - transform odds and filter out matches without odds
      let footballDaily = this.generateFootballDaily(
        footballDailyFixtures,
        allLeagues, // Pass all leagues for better name resolution
        true // includeAllLeagues flag
      )
        .map((league) => ({
          ...league,
          matches: league.matches
            .map((match) => ({
              ...this.transformMatchOdds(match),
              odds: this.extractMainOddsObject(match.odds), // Only keep main odds for homepage
            }))
            .filter(
              (match) => match.odds && Object.keys(match.odds).length > 0
            ),
        }))
        .filter((league) => league.matches.length > 0); // Filter out leagues with no matches

      const homepageData = {
        top_picks: topPicks,
        football_daily: footballDaily,
        // in_play: [], // Skip for now as requested
      };

      // Cache for 10 minutes
      this.fixtureCache.set(cacheKey, homepageData, 600);
      return homepageData;
    } catch (error) {
      console.error("❌ Error fetching homepage data:", error);
      // Return empty data structure on error
      return {
        top_picks: [],
        football_daily: [],
        // in_play: [], // Skip for now
      };
    }
  }

  // Helper method to select top picks based on various criteria
  selectTopPicks(fixtures, limit = 10) {
    if (!fixtures || fixtures.length === 0) return [];

    // Score fixtures based on multiple criteria
    const scoredFixtures = fixtures.map((fixture) => {
      let score = 0;

      // Prefer matches with better odds variety (closer odds = more competitive)
      if (fixture.odds && fixture.odds.length > 0) {
        const homeOdd =
          fixture.odds.find(
            (o) =>
              o.name &&
              (o.name.toLowerCase().includes("home") || o.name === "1")
          )?.value || 0;
        const drawOdd =
          fixture.odds.find(
            (o) =>
              o.name &&
              (o.name.toLowerCase().includes("draw") || o.name === "X")
          )?.value || 0;
        const awayOdd =
          fixture.odds.find(
            (o) =>
              o.name &&
              (o.name.toLowerCase().includes("away") || o.name === "2")
          )?.value || 0;

        if (homeOdd && drawOdd && awayOdd) {
          // Convert to numbers for calculation
          const homeNum = parseFloat(homeOdd) || 0;
          const awayNum = parseFloat(awayOdd) || 0;

          // Prefer matches where odds are between 1.5 and 3.5 (competitive)
          const avgOdds = (homeNum + awayNum) / 2;
          if (avgOdds >= 1.5 && avgOdds <= 3.5) score += 30;
          else if (avgOdds >= 1.2 && avgOdds <= 5.0) score += 15;
        }
      }

      // Prefer popular leagues
      const popularLeagueNames = [
        "Premier League",
        "Champions League",
        "La Liga",
        "Serie A",
        "Bundesliga",
        "Ligue 1",
        "Europa League",
        "World Cup",
        "European Championship",
        "Copa America",
      ];
      if (
        fixture.league &&
        popularLeagueNames.some((name) =>
          fixture.league.name.toLowerCase().includes(name.toLowerCase())
        )
      ) {
        score += 25;
      }

      // Prefer matches happening soon (today gets highest priority)
      const now = new Date();
      const matchTime = new Date(fixture.starting_at);
      const hoursUntilMatch = (matchTime - now) / (1000 * 60 * 60);

      if (hoursUntilMatch >= 0 && hoursUntilMatch <= 24) score += 20; // Today
      else if (hoursUntilMatch > 24 && hoursUntilMatch <= 48)
        score += 15; // Tomorrow
      else if (hoursUntilMatch > 48 && hoursUntilMatch <= 72) score += 10; // Day after

      // Prefer matches with recognizable teams (heuristic: longer team names often = bigger clubs)
      const homeTeamLength =
        fixture.localteam?.name?.length ||
        fixture.participants?.find((p) => p.meta?.location === "home")?.name
          ?.length ||
        0;
      const awayTeamLength =
        fixture.visitorteam?.name?.length ||
        fixture.participants?.find((p) => p.meta?.location === "away")?.name
          ?.length ||
        0;
      if (homeTeamLength > 8 || awayTeamLength > 8) score += 10;

      // Attach league data from cache
      const league = this.getLeagueById(fixture.league_id);

      return { ...fixture, topPickScore: score, league };
    });

    // Sort by score and return top picks (removing score from result)
    return scoredFixtures
      .sort((a, b) => b.topPickScore - a.topPickScore)
      .slice(0, limit)
      .map(({ topPickScore, ...fixture }) => fixture); // Remove score from final result
  }

  // Helper method to generate football daily data grouped by leagues
  generateFootballDaily(fixtures, topLeagues, includeAllLeagues = false) {
    if (!fixtures || fixtures.length === 0) {
      return [];
    }

    const footballDaily = [];

    if (includeAllLeagues) {
      // Group fixtures by all leagues present in the data
      const leagueMap = new Map();

      // First, collect all unique leagues from fixtures
      fixtures.forEach((fixture) => {
        const leagueId = fixture.league_id || fixture.league?.id;

        if (leagueId && !leagueMap.has(leagueId)) {
          // Try to find league info from topLeagues first, then from fixture.league
          const topLeagueInfo = topLeagues.find((tl) => tl.id === leagueId);
          const leagueName =
            topLeagueInfo?.name || fixture.league?.name || `League ${leagueId}`;
          const leagueLogo =
            topLeagueInfo?.image_path || fixture.league?.image_path || null;
          const leagueCountry =
            typeof topLeagueInfo?.country === "string"
              ? topLeagueInfo?.country
              : topLeagueInfo?.country?.name ||
                fixture.league?.country?.name ||
                null;

          leagueMap.set(leagueId, {
            id: leagueId,
            name: leagueName,
            imageUrl: leagueLogo,
            country: leagueCountry,
            matches: [],
          });
        }
      });

      // Group fixtures by league
      fixtures.forEach((fixture) => {
        const leagueId = fixture.league_id || fixture.league?.id;
        if (leagueId && leagueMap.has(leagueId)) {
          leagueMap.get(leagueId).matches.push(fixture);
        }
      });

      // Convert map to array and process each league
      leagueMap.forEach((leagueData) => {
        if (leagueData.matches.length > 0) {
          // Sort matches by date/time and limit per league
          const sortedMatches = leagueData.matches
            .sort((a, b) => new Date(a.starting_at) - new Date(b.starting_at))
            .slice(0, 12); // Increased to 12 matches per league for 20-day range

          footballDaily.push({
            league: {
              id: leagueData.id,
              name: leagueData.name,
              imageUrl: leagueData.imageUrl,
              country: leagueData.country,
            },
            matches: sortedMatches,
            match_count: sortedMatches.length,
          });
        }
      });

      // Sort leagues by number of matches, then by priority (top leagues first)
      return footballDaily
        .sort((a, b) => {
          // First priority: if it's a top league
          const aIsTop = topLeagues.some((tl) => tl.id === a.league.id);
          const bIsTop = topLeagues.some((tl) => tl.id === b.league.id);

          if (aIsTop && !bIsTop) return -1;
          if (!aIsTop && bIsTop) return 1;

          // Second priority: number of matches
          return b.match_count - a.match_count;
        })
        .slice(0, 20); // Limit to top 20 leagues
    } else {
      // Original logic for top leagues only
      topLeagues.forEach((league) => {
        const leagueFixtures = fixtures.filter((fixture) => {
          const matchesById = fixture.league_id === league.id;
          const matchesByObject =
            fixture.league && fixture.league.id === league.id;
          return matchesById || matchesByObject;
        });

        if (leagueFixtures.length > 0) {
          const sortedMatches = leagueFixtures
            .sort((a, b) => new Date(a.starting_at) - new Date(b.starting_at))
            .slice(0, 8);

          footballDaily.push({
            league: {
              id: league.id,
              name: league.name,
              imageUrl: league.image_path || null,
              country: league.country?.name || null,
            },
            matches: sortedMatches,
            match_count: sortedMatches.length,
          });
        }
      });

      return footballDaily.sort((a, b) => b.match_count - a.match_count);
    }
  }

  // Transform match odds to return only home/draw/away odds
  transformMatchOdds(match) {
    if (!match) return match;

    let transformedMatch = { ...match };

    // Extract and standardize odds to only include home/draw/away, but do NOT overwrite the original odds array
    if (match.odds && Array.isArray(match.odds)) {
      const homeOdd = match.odds.find(
        (o) =>
          o.name && (o.name.toLowerCase().includes("home") || o.name === "1")
      );
      const drawOdd = match.odds.find(
        (o) =>
          o.name && (o.name.toLowerCase().includes("draw") || o.name === "X")
      );
      const awayOdd = match.odds.find(
        (o) =>
          o.name && (o.name.toLowerCase().includes("away") || o.name === "2")
      );

      const oddsObj = {};
      if (homeOdd?.value && !isNaN(parseFloat(homeOdd.value))) {
        oddsObj.home = {
          value: parseFloat(homeOdd.value),
          oddId: homeOdd.id,
        };
      }
      if (drawOdd?.value && !isNaN(parseFloat(drawOdd.value))) {
        oddsObj.draw = {
          value: parseFloat(drawOdd.value),
          oddId: drawOdd.id,
        };
      }
      if (awayOdd?.value && !isNaN(parseFloat(awayOdd.value))) {
        oddsObj.away = {
          value: parseFloat(awayOdd.value),
          oddId: awayOdd.id,
        };
      }

      // Instead of overwriting odds, add odds_main for simplified odds
      transformedMatch.odds_main = oddsObj;
      // Keep the original odds array as 'odds'
    } else if (match.odds && typeof match.odds === "object") {
      // If odds is already an object, standardize the structure for odds_main
      const oddsObj = {};
      if (match.odds.home && !isNaN(parseFloat(match.odds.home))) {
        oddsObj.home = parseFloat(match.odds.home);
      }
      if (match.odds.draw && !isNaN(parseFloat(match.odds.draw))) {
        oddsObj.draw = parseFloat(match.odds.draw);
      }
      if (match.odds.away && !isNaN(parseFloat(match.odds.away))) {
        oddsObj.away = parseFloat(match.odds.away);
      }
      if (match.odds["1"] && !isNaN(parseFloat(match.odds["1"]))) {
        oddsObj.home = parseFloat(match.odds["1"]);
      }
      if (match.odds["X"] && !isNaN(parseFloat(match.odds["X"]))) {
        oddsObj.draw = parseFloat(match.odds["X"]);
      }
      if (match.odds["2"] && !isNaN(parseFloat(match.odds["2"]))) {
        oddsObj.away = parseFloat(match.odds["2"]);
      }
      transformedMatch.odds_main = oddsObj;
      // Do not overwrite odds
    } else {
      // No valid odds found
      transformedMatch.odds_main = {};
    }

    return transformedMatch;
  }

  checkRateLimit() {
    const now = Date.now();
    const hoursPassed = (now - this.lastResetTime) / (1000 * 60 * 60);

    if (hoursPassed >= 1) {
      this.apiCallCount = 0;
      this.lastResetTime = now;
    }

    if (this.apiCallCount >= this.maxCallsPerHour) {
      throw new CustomError(
        "API rate limit exceeded. Please try again later.",
        429,
        "RATE_LIMIT_EXCEEDED"
      );
    }
  }

  // Method to preload popular data during off-peak hours
  async preloadPopularData() {
    console.log("🔄 Preloading popular fixture data...");

    try {
      const popularLeagues = await this.getPopularLeagues();
      const leagueIds = popularLeagues.map((l) => l.id);

      // Preload today's fixtures for popular leagues
      await this.getTodaysFixtures(leagueIds);

      // Preload live fixtures
      await this.getLiveFixtures();

      console.log("✅ Popular data preloaded successfully");
    } catch (error) {
      console.error("❌ Error preloading data:", error);
    }
  }

  // Get cache statistics
  getCacheStats() {
    return {
      fixture_cache: {
        keys: this.fixtureCache.keys().length,
        stats: this.fixtureCache.getStats(),
      },
      live_cache: {
        keys: this.liveCache.keys().length,
        stats: this.liveCache.getStats(),
      },
      league_cache: {
        keys: this.leagueCache.keys().length,
        stats: this.leagueCache.getStats(),
      },
      api_calls_today: this.apiCallCount,
    };
  }

  // Clear specific caches
  clearCache(type = "all") {
    switch (type) {
      case "fixtures":
        this.fixtureCache.flushAll();
        break;
      case "live":
        this.liveCache.flushAll();
        break;
      case "leagues":
        this.leagueCache.flushAll();
        break;
      case "all":
      default:
        this.fixtureCache.flushAll();
        this.liveCache.flushAll();
        this.leagueCache.flushAll();
        break;
    }
  }

  /**
   * Utility: Get all cached fixtures from fixtureCache
   * Returns a flat array of all fixtures in the cache (from all keys)
   */
  getAllCachedMatches() {
    const cacheKeys = this.fixtureCache.keys();
    let allFixtures = [];
    for (const key of cacheKeys) {
      if (key.startsWith("fixtures_") || key === "homepage_data") {
        const cachedData = this.fixtureCache.get(key);
        if (cachedData) {
          if (cachedData instanceof Map) {
            allFixtures = allFixtures.concat(Array.from(cachedData.values()));
          } else if (Array.isArray(cachedData)) {
            allFixtures = allFixtures.concat(cachedData);
          } else if (cachedData.data && Array.isArray(cachedData.data)) {
            allFixtures = allFixtures.concat(cachedData.data);
          } else if (cachedData.top_picks || cachedData.football_daily) {
            allFixtures = allFixtures.concat(
              cachedData.top_picks || [],
              ...(cachedData.football_daily || []).map((l) => l.matches || [])
            );
          }
        }
      }
    }
    return allFixtures;
  }

  async getMatchById(matchId, options = {}) {
    const {
      includeOdds = true,
      includeLeague = true,
      includeParticipants = true,
    } = options;

    if (!matchId) {
      throw new CustomError("Match ID is required", 400, "INVALID_MATCH_ID");
    }

    // 1. Try to get from dedicated match cache first
    const matchCacheKey = `match_${matchId}`;
    let cachedMatch = this.fixtureCache.get(matchCacheKey);

    if (cachedMatch) {
      console.log("📦 Found match in dedicated match cache");
      return cachedMatch;
    }

    // 2. If not found, search in all cached fixtures
    const allCachedMatches = this.getAllCachedMatches();
    cachedMatch = allCachedMatches.find(
      (fixture) => fixture.id == matchId || fixture.id === parseInt(matchId)
    );

    if (!cachedMatch) {
      // 3. If still not found, make API call (using getOptimizedFixtures)
      console.log("🔍 Match not found in cache, making API call...");
      this.checkRateLimit();
      try {
        const fixturesMap = await this.getOptimizedFixtures();
        // Use Map for direct lookup
        cachedMatch = fixturesMap instanceof Map ? fixturesMap.get(Number(matchId)) : null;
        if (!cachedMatch) {
          // fallback: if not found in Map, try array search (for legacy or error cases)
          let fixtures = this.getAllFixturesArrayFromMap(fixturesMap);
          cachedMatch = fixtures.find(
            (fixture) => fixture.id == matchId || fixture.id === parseInt(matchId)
          );
        }
        if (!cachedMatch) {
          throw new CustomError(
            `Match with ID ${matchId} not found`,
            404,
            "MATCH_NOT_FOUND"
          );
        }
        console.log("✅ Found match in API response");
      } catch (error) {
        if (error.code === "MATCH_NOT_FOUND") {
          throw error;
        }
        console.error("❌ Error fetching match from API:", error);
        throw new CustomError("Failed to fetch match data", 500, "API_ERROR");
      }
    }

    // Always group odds by market for the returned match
    cachedMatch.odds = this.groupOddsByMarket(cachedMatch.odds);

    // Add odds classification and betting data format
    if (cachedMatch.odds && Object.keys(cachedMatch.odds).length > 0) {
      try {
        const oddsData = { odds_by_market: cachedMatch.odds };
        const classification = classifyOdds(oddsData);
        cachedMatch.odds_classification = classification;
        cachedMatch.betting_data = transformToBettingData(
          classification,
          cachedMatch
        );
      } catch (classificationError) {
        console.error("⚠️ Error classifying odds:", classificationError);
        // Provide fallback data structure
        cachedMatch.odds_classification = {
          categories: [{ id: "all", label: "All", odds_count: 0 }],
          classified_odds: {},
          stats: { total_categories: 0, total_odds: 0 },
        };
        cachedMatch.betting_data = [];
      }
    }

    // Cache the match for future direct access
    this.fixtureCache.set(matchCacheKey, cachedMatch, 3600); // 1 hour TTL

    console.log(`✅ Successfully retrieved match ${matchId} with all details`);
    return cachedMatch;
  }

  groupOddsByMarket(odds) {
    if (!odds || !Array.isArray(odds)) return {};

    const groupedOdds = {};

    odds.forEach((odd) => {
      const marketId = odd.market_id;
      const marketDescription = odd.market_description || `Market ${marketId}`;

      if (!groupedOdds[marketId]) {
        groupedOdds[marketId] = {
          market_id: marketId,
          market_description: marketDescription,
          odds: [],
        };
      }

      groupedOdds[marketId].odds.push(odd);
    });

    return groupedOdds;
  }

  async getMatchesByLeague(leagueId) {
    if (!leagueId) {
      throw new CustomError("League ID is required", 400, "INVALID_LEAGUE_ID");
    }
    const cacheKey = `league_matches_${leagueId}`;
    // Check cache first
    const cached = this.fixtureCache.get(cacheKey);
    if (cached) {
      console.log("📦 Returning cached matches for league from cache");
      const league = this.getLeagueById(parseInt(leagueId));
      const fixtures = (cached.fixtures || []).map(f => {
        let odds =this.extractMainOddsObject(f.odds);
        return {
          ...f,
          odds,
          odds_main: undefined, // Remove odds_main from response
        };
      });
      return { fixtures, league };
    }
    this.checkRateLimit();
    try {
      const fixturesMap = await this.getOptimizedFixtures();
      let fixtures = this.getAllFixturesArrayFromMap(fixturesMap).filter(
        (f) => f.league_id === parseInt(leagueId)
      );
      fixtures = fixtures.map(f => {
        let odds =  (f.odds);
        return {
          ...f,
          odds,
          odds_main: undefined, // Remove odds_main from response
        };
      });
      const league = this.getLeagueById(parseInt(leagueId));
      this.fixtureCache.set(cacheKey, { fixtures, league });
      console.log(
        `✅ Fetched and cached ${fixtures.length} matches for league ${leagueId}`
      );
      return { fixtures, league };
    } catch (error) {
      console.error("❌ Error fetching matches for league:", error);
      return {
        fixtures: [],
        league: this.getLeagueById(parseInt(leagueId)),
      };
    }
  }

  // Helper to get league data by id from the leagueCache
  getLeagueById(leagueId) {
    if (!leagueId) {
      return {
        id: null,
        name: "Unknown League",
        imageUrl: null,
        country: null,
      };
    }
    let leagues = this.leagueCache.get("popular_leagues");
    if (!Array.isArray(leagues) || leagues.length === 0) {
      return {
        id: leagueId,
        name: `League ${leagueId}`,
        imageUrl: null,
        country: null,
      };
    }
    const foundLeague = leagues.find((l) => Number(l.id) === leagueId);
    if (!foundLeague) {
      return {
        id: leagueId,
        name: `League ${leagueId}`,
        imageUrl: null,
        country: null,
      };
    }
    return {
      id: foundLeague.id,
      name: foundLeague.name,
      imageUrl: foundLeague.image_path || null,
      country:
        typeof foundLeague.country === "string"
          ? foundLeague.country
          : foundLeague.country?.name || null,
    };
  }

  // Refresh all fixtures and leagues, flush old cache, and repopulate
  async refreshAllData() {
    try {
      console.log("[CacheRefresh] Flushing old caches...");
      this.fixtureCache.flushAll();
      this.leagueCache.flushAll();
      // Fetch and cache leagues
      await this.getPopularLeagues();
      // Fetch and cache fixtures (this will cache for the next 7 days, but you can adjust as needed)
      await this.getOptimizedFixtures();
      // Optionally, preload homepage data
      await this.getHomepageData();
      console.log("[CacheRefresh] All data refreshed and cached.");
    } catch (err) {
      console.error("[CacheRefresh] Error refreshing all data:", err);
    }
  }

  // Helper to extract main odds in the expected frontend format
  extractMainOddsObject(oddsArray) {
    if (!Array.isArray(oddsArray)) return {};
    const homeOdd = oddsArray.find(o => o.name?.toLowerCase().includes("home") || o.name === "1");
    const drawOdd = oddsArray.find(o => o.name?.toLowerCase().includes("draw") || o.name === "X");
    const awayOdd = oddsArray.find(o => o.name?.toLowerCase().includes("away") || o.name === "2");
    return {
      home: homeOdd ? { value: homeOdd.value, oddId: homeOdd.id } : undefined,
      draw: drawOdd ? { value: drawOdd.value, oddId: drawOdd.id } : undefined,
      away: awayOdd ? { value: awayOdd.value, oddId: awayOdd.id } : undefined,
    };
  }

  // Helper to get all fixtures as an array from the Map
  getAllFixturesArrayFromMap(fixturesMap) {
    if (!fixturesMap) return [];
    if (fixturesMap instanceof Map) {
      return Array.from(fixturesMap.values());
    }
    if (Array.isArray(fixturesMap)) return fixturesMap;
    return [];
  }
}

export default new FixtureOptimizationService();

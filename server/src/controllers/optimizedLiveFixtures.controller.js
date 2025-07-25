import MatchSchedulerService from '../services/MatchScheduler.service.js';
import { CustomError } from '../utils/customErrors.js';

class OptimizedLiveFixturesController {
  constructor() {
    this.matchScheduler = null;
  }

  setMatchScheduler(matchScheduler) {
    this.matchScheduler = matchScheduler;
  }

  /**
   * Get live matches using the optimized scheduler
   */
  async getOptimizedLiveMatches(req, res, next) {
    try {
      if (!this.matchScheduler) {
        throw new CustomError('Match scheduler not initialized', 500, 'SCHEDULER_NOT_INITIALIZED');
      }

      const liveMatches = await this.matchScheduler.getLiveMatches();
      
      // Group by leagues (similar to existing implementation)
      const leagueGroups = this.groupMatchesByLeague(liveMatches);

      res.json({
        success: true,
        data: leagueGroups,
        meta: {
          totalMatches: liveMatches.length,
          totalLeagues: leagueGroups.length,
          timestamp: new Date().toISOString(),
          source: 'optimized_scheduler'
        }
      });

    } catch (error) {
      console.error('[OptimizedLiveFixtures] Error getting live matches:', error);
      next(error);
    }
  }

  /**
   * Get detailed live match with timing info
   */
  async getLiveMatchDetails(req, res, next) {
    try {
      const { matchId } = req.params;
      
      if (!this.matchScheduler) {
        throw new CustomError('Match scheduler not initialized', 500, 'SCHEDULER_NOT_INITIALIZED');
      }

      const match = this.matchScheduler.liveMatchesCache.get(parseInt(matchId));
      
      if (!match) {
        throw new CustomError('Live match not found', 404, 'LIVE_MATCH_NOT_FOUND');
      }

      // Get fresh odds
      const odds = await this.matchScheduler.fetchAndCacheMatchOdds(parseInt(matchId));

      res.json({
        success: true,
        data: {
          ...match,
          odds: odds || [],
          timing: {
            ...match.timing,
            currentTime: Date.now(),
            elapsedSinceCache: Date.now() - match.timing.cacheTime
          }
        }
      });

    } catch (error) {
      console.error('[OptimizedLiveFixtures] Error getting match details:', error);
      next(error);
    }
  }

  /**
   * Force refresh a specific live match
   */
  async refreshLiveMatch(req, res, next) {
    try {
      const { matchId } = req.params;
      
      if (!this.matchScheduler) {
        throw new CustomError('Match scheduler not initialized', 500, 'SCHEDULER_NOT_INITIALIZED');
      }

      // Force refresh odds
      this.matchScheduler.liveOddsCache.del(parseInt(matchId));
      const odds = await this.matchScheduler.fetchAndCacheMatchOdds(parseInt(matchId));

      const match = this.matchScheduler.liveMatchesCache.get(parseInt(matchId));

      res.json({
        success: true,
        data: {
          matchId: parseInt(matchId),
          refreshed: true,
          hasMatch: !!match,
          hasOdds: !!odds,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('[OptimizedLiveFixtures] Error refreshing match:', error);
      next(error);
    }
  }

  /**
   * Get scheduler status and statistics
   */
  async getSchedulerStatus(req, res, next) {
    try {
      if (!this.matchScheduler) {
        throw new CustomError('Match scheduler not initialized', 500, 'SCHEDULER_NOT_INITIALIZED');
      }

      const status = {
        liveMatches: this.matchScheduler.liveMatchesCache.keys().length,
        delayedMatches: this.matchScheduler.delayedMatches.size,
        scheduledJobs: this.matchScheduler.scheduledJobs.size,
        cacheStats: {
          liveMatches: this.matchScheduler.liveMatchesCache.getStats(),
          liveOdds: this.matchScheduler.liveOddsCache.getStats()
        },
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('[OptimizedLiveFixtures] Error getting scheduler status:', error);
      next(error);
    }
  }

  /**
   * Group matches by league
   */
  groupMatchesByLeague(matches) {
    const leagueMap = new Map();

    for (const match of matches) {
      const leagueId = match.league_id;
      
      if (!leagueMap.has(leagueId)) {
        leagueMap.set(leagueId, {
          league: {
            id: leagueId,
            name: match.league?.name || `League ${leagueId}`,
            imageUrl: match.league?.image_path || null,
            country: match.league?.country?.name || match.league?.country || null
          },
          matches: []
        });
      }
      
      leagueMap.get(leagueId).matches.push(match);
    }

    return Array.from(leagueMap.values());
  }
}

export default new OptimizedLiveFixturesController();

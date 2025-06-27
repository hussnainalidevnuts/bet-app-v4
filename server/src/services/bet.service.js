import Bet from "../models/Bet.js";
import User from "../models/User.js";
import MatchOdds from "../models/matchOdds.model.js";
import SportsMonksService from "./sportsMonks.service.js";
import FixtureOptimizationService from "./fixture.service.js";
import { CustomError } from "../utils/customErrors.js";

class BetService {
  async placeBet(userId, matchId, oddId, stake) {
    //INFO: Check MatchOdds collection first

    let matchData;
    const cachedOdds = await MatchOdds.findOne({ matchId });
    if (
      cachedOdds &&
      cachedOdds.updatedAt > new Date(Date.now() - 5 * 60 * 1000)
    ) {
      console.log(`Using MongoDB cached odds for match ${matchId}`);
      matchData = {
        id: matchId,
        odds: cachedOdds.odds.map((odd) => ({
          id: odd.oddId,
          market_id: odd.marketId,
          name: odd.name,
          value: odd.value,
        })),
        starting_at: cachedOdds.createdAt,
      };
    } else {
      console.log(
        `No fresh MongoDB cache for match ${matchId}, checking fixtureCache`
      );

      // Check fixtureCache
      let cacheHit = false;
      const cacheKeys = FixtureOptimizationService.fixtureCache.keys();
      for (const key of cacheKeys) {
        const cachedData = FixtureOptimizationService.fixtureCache.get(key);
        if (cachedData) {
          let fixtures = Array.isArray(cachedData)
            ? cachedData
            : cachedData.data || [];

          matchData = fixtures.find(
            (fixture) =>
              fixture.id == matchId || fixture.id === parseInt(matchId)
          );
          if (matchData) {
            console.log(`Cache hit for match ${matchId} in fixtureCache`);
            console.log(matchData);
            cacheHit = true;
            break;
          }
        }
      }

      // Fetch from API if not in cache
      if (!cacheHit) {
        console.log(
          `Fetching odds for match ${matchId} from Sportmonks API via getOptimizedFixtures`
        );
        const apiParams = {
          filters: `fixtureIds:${matchId}`,
          include: "odds;participants;state",
          per_page: 1,
        };
        const matches = await FixtureOptimizationService.getOptimizedFixtures(
          apiParams
        );

        if (!matches || matches.length === 0) {
          throw new CustomError("Match not found", 404, "MATCH_NOT_FOUND");
        }

        // Update MatchOdds and fixtureCache
        for (const match of matches) {
          await MatchOdds.findOneAndUpdate(
            { matchId: match.id },
            {
              matchId: match.id,
              odds: match.odds.map((odd) => ({
                oddId: odd.id,
                marketId: odd.market_id,
                name: odd.name,
                value: parseFloat(odd.value),
              })),
              updatedAt: new Date(),
            },
            { upsert: true }
          );
          const cacheKey = `match_${match.id}`;
          FixtureOptimizationService.fixtureCache.set(cacheKey, match, 3600);
          console.log(`Cached match ${match.id} in fixtureCache`);
        }

        // Find the requested match
        matchData = matches.find(
          (match) => match.id == matchId || match.id === parseInt(matchId)
        );
        if (!matchData) {
          throw new CustomError("Match not found", 404, "MATCH_NOT_FOUND");
        }
      }
    }

    // Validate odd_id and odds
    console.log(matchData.odds);
    const odds = matchData.odds?.find((odd) => odd.id === oddId);

    if (!odds) {
      throw new CustomError("Invalid odd ID", 400, "INVALID_ODD_ID");
    }

    // Validate user and balance
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError("User not found", 404, "USER_NOT_FOUND");
    }
    if (user.balance < stake) {
      throw new CustomError(
        "Insufficient balance",
        400,
        "INSUFFICIENT_BALANCE"
      );
    }

    // Deduct stake from user balance
    user.balance -= stake;
    await user.save();

    // Construct teams string
    let teams = "";
    if (matchData.participants && matchData.participants.length >= 2) {
      teams = `${matchData.participants[0].name} vs ${matchData.participants[1].name}`;
    }

    // Construct market description

    // Construct selection string
    const selection = `${odds.name} - ${odds.market_description} `;

    // Create bet
    const bet = new Bet({
      userId,
      matchId,
      oddId,
      betOption: odds.name,
      odds: parseFloat(odds.value),
      stake,
      payout: 0,
      matchDate: new Date(matchData.starting_at),
      teams,
      selection,
    });
    await bet.save();

    return {
      betId: bet._id,
      matchId,
      oddId,
      betOption: bet.betOption,
      odds: bet.odds,
      stake: bet.stake,
      status: bet.status,
      createdAt: bet.createdAt,
    };
  }

  async updateMatchOdds(matchIds) {
    if (!matchIds || matchIds.length === 0) {
      return [];
    }
    console.log(`Updating odds for ${matchIds.length} matches`);
    const apiParams = {
      filters: `fixtureIds:${matchIds.join(",")}`,
      include: "odds;participants;state",
      per_page: matchIds.length,
    };
    const response = await FixtureOptimizationService.getOptimizedFixtures(
      apiParams
    );
    const matches = response.data || [];
    for (const match of matches) {
      await MatchOdds.findOneAndUpdate(
        { matchId: match.id },
        {
          matchId: match.id,
          odds: match.odds.map((odd) => ({
            oddId: odd.id,
            marketId: odd.market_id,
            name: odd.name,
            value: parseFloat(odd.value),
          })),
          updatedAt: new Date(),
        },
        { upsert: true }
      );
      const cacheKey = `match_${match.id}`;
      FixtureOptimizationService.fixtureCache.set(cacheKey, match, 3600);
    }
    console.log(
      `Updated MatchOdds and fixtureCache for ${matches.length} matches`
    );
    return matches;
  }

  async checkBetOutcome(betId) {
    const bet = await Bet.findById(betId).populate("userId");
    if (!bet) {
      throw new CustomError("Bet not found", 404, "BET_NOT_FOUND");
    }

    // Fetch match data from Sportmonks
    const response = await SportsMonksService.client.get(
      `/football/fixtures/${bet.matchId}`,
      {
        params: {
          include: "odds;state;scores;participants",
        },
      }
    );
    const match = response.data.data;
    if (!match) {
      throw new CustomError("Match not found", 404, "MATCH_NOT_FOUND");
    }

    // Check if match has ended
    if (match.state.id !== 5) {
      return {
        betId,
        status: bet.status,
        message: "Match not yet finished",
      };
    }

    // Find the odd by odd_id
    const selectedOdd = match.odds?.find((odd) => odd.id === bet.oddId);
    if (!selectedOdd) {
      throw new CustomError(
        "Odd ID not found in match data",
        404,
        "ODD_NOT_FOUND"
      );
    }

    // Update bet status based on winning flag
    if ("winning" in selectedOdd) {
      bet.status = selectedOdd.winning ? "won" : "lost";
      if (bet.status === "won") {
        bet.payout = bet.stake * bet.odds;
      } else {
        bet.payout = 0;
      }
    } else {
      // Fallback logic for markets without winning flag
      const homeGoals =
        match.scores.find(
          (s) => s.participant === "home" && s.description === "CURRENT"
        )?.score.goals || 0;
      const awayGoals =
        match.scores.find(
          (s) => s.participant === "away" && s.description === "CURRENT"
        )?.score.goals || 0;
      const homeTeam = match.participants.find(
        (p) => p.meta.location === "home"
      )?.name;
      const awayTeam = match.participants.find(
        (p) => p.meta.location === "away"
      )?.name;

      if (selectedOdd.market_id === "1") {
        // 3-way result
        if (homeGoals > awayGoals && bet.betOption === homeTeam) {
          bet.status = "won";
          bet.payout = bet.stake * bet.odds;
        } else if (awayGoals > homeGoals && bet.betOption === awayTeam) {
          bet.status = "won";
          bet.payout = bet.stake * bet.odds;
        } else if (homeGoals === awayGoals && bet.betOption === "Draw") {
          bet.status = "won";
          bet.payout = bet.stake * bet.odds;
        } else {
          bet.status = "lost";
          bet.payout = 0;
        }
      } else if (selectedOdd.market_id === "8") {
        // Over/under
        const totalGoals = homeGoals + awayGoals;
        const threshold = parseFloat(bet.betOption.split(" ")[1]); // e.g., "Over 2.5"
        if (bet.betOption.includes("Over") && totalGoals > threshold) {
          bet.status = "won";
          bet.payout = bet.stake * bet.odds;
        } else if (bet.betOption.includes("Under") && totalGoals < threshold) {
          bet.status = "won";
          bet.payout = bet.stake * bet.odds;
        } else {
          bet.status = "lost";
          bet.payout = 0;
        }
      } else {
        throw new CustomError(
          "Market not supported without winning flag",
          400,
          "UNSUPPORTED_MARKET"
        );
      }
    }

    // Update user balance if bet won
    if (bet.status === "won") {
      const user = bet.userId;
      user.balance += bet.stake * bet.odds;
      await user.save();
    }

    await bet.save();

    return {
      betId: bet._id,
      status: bet.status,
      payout: bet.status === "won" ? bet.stake * bet.odds : 0,
    };
  }

  async checkPendingBets() {
    const pendingBets = await Bet.find({ status: "pending" });
    const results = [];

    for (const bet of pendingBets) {
      const result = await this.checkBetOutcome(bet._id);
      results.push(result);
    }

    return results;
  }

  async getUserBets(userId) {
    if (!userId) {
      throw new CustomError("User ID is required", 400, "USER_ID_REQUIRED");
    }
    const bets = await Bet.find({ userId }).sort({ createdAt: -1 });
    return bets;
  }

  async getAllBets() {
    // Get all bets and populate user info
    const bets = await Bet.find({}).populate("userId");
    // Group bets by username (firstName + lastName or email)
    const grouped = {};
    for (const bet of bets) {
      const user = bet.userId;
      let userName = "Unknown User";
      if (user && (user.firstName || user.lastName)) {
        userName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      } else if (user && user.email) {
        userName = user.email;
      }
      if (!grouped[userName]) grouped[userName] = [];
      // Only push plain bet object (remove userId field to avoid extra info)
      const betObj = bet.toObject();
      delete betObj.userId;
      grouped[userName].push(betObj);
    }
    return grouped;
  }
}

export default new BetService();

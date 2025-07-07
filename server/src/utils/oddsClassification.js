// Simple odds classification helper
const classifyOdds = (oddsData) => {
  // Define category mappings based on your frontend structure
  const categories = {
    "pre-packs": {
      id: "pre-packs",
      label: "Pre-packs",
      keywords: [
        "pre-pack",
        "prepack",
        "pre-packs",
        "prepacks",
        "combo",
        "special pack",

      ],
      markets: [], // Add market IDs if available
      priority: 1,
    },
    "even-odd": {
      id: "even-odd",
      label: "Even/Odd",
      keywords: [
        "even",
        "odd",
        "total even",
        "total odd",
        "even/odd",
        "odd/even"
      ],
      markets: [],
      priority: 3,
    },
    "full-time": {
      id: "full-time",
      label: "Full Time",
      keywords: [
        "full time",
        "match result",
        "1x2",
        "winner",
        "moneyline",
        "result",
        "final result",
        "last team to",
        "Team total",
        "Home Team Exact",
        "Away Team Exact",
      ],
      markets: [1, 52, 13, 14, 80],
      priority: 2,
    },
    "player-shots-on-target": {
      id: "player-shots-on-target",
      label: "Player Shots on Target",
      keywords: ["shots on target", "player shots on target"],
      markets: [],
      priority: 3,
    },
    "player-shots": {
      id: "player-shots",
      label: "Player Shots",
      keywords: ["player shots", "shots"],
      markets: [],
      priority: 4,
    },
    "player-cards": {
      id: "player-cards",
      label: "Player Cards",
      keywords: ["cards", "yellow card", "red card", "booking"],
      markets: [],
      priority: 5,
    },
    "half-time": {
      id: "half-time",
      label: "Half Time",
      keywords: [
        "First Team to",
        "half",
        "1st half",
        "2nd half",
        "halftime",
        "first half",
        "second half",
      ],
      markets: [31, 97, 49, 28, 15, 16, 45, 124, 26],
      priority: 6,
    },
    
    "goals": {
      id: "goals",
      label: "Goals",
      keywords: [
        "total goals",
        "hat trick",
        "both teams to",
      ],
      markets: [18, 19],
      priority: 7,
    },
    "team-goalscorer": {
      id: "team-goalscorer",
      label: "Team Goalscorer",
      keywords: [
        "team goalscorer"
      ],
      markets: [247, 11],
      priority: 8,
    },
    "multi-goalscorer": {
      id: "multi-goalscorer",
      label: "Multi Scorers",
      keywords: [
        "multi scorers"
      ],
      markets: [247, 11],
      priority: 9,
    },
    "goalscorers": {
      id: "goalscorers",
      label: "Goalscorers",
      keywords: [
        "anytime",
        "first goalscorer",
        "last goalscorer",
        "first scorer",
        "last scorer",
        "goalscorer"
      ],
      markets: [247, 11],
      priority: 8,
    },
    corners: {
      id: "corners",
      label: "Corners",
      keywords: ["corner", "corners"],
      markets: [],
      priority: 9,
    },
    "three-way-handicap": {
      id: "three-way-handicap",
      label: "3 Way Handicap",
      keywords: ["3 way handicap", "three way handicap"],
      markets: [],
      priority: 10,
    },
    "asian-lines": {
      id: "asian-lines",
      label: "Asian Lines",
      keywords: ["asian", "asian handicap", "asian lines"],
      markets: [6, 26],
      priority: 11,
    },
    // specials: {
    //   id: "specials",
    //   label: "Specials",
    //   keywords: ["odd", "even", "win to nil", "both halves", "special"],
    //   markets: [44, 45, 124, 46, 40, 101, 266],
    //   priority: 12,
    // },
    others: {
      id: "others",
      label: "Others",
      keywords: [],
      markets: [],
      priority: 99,
    },
  };

  if (!oddsData || !oddsData.odds_by_market) {
    return {
      categories: [{ id: "all", label: "All", odds_count: 0 }],
      classified_odds: {},
      stats: { total_categories: 0, total_odds: 0 },
    };
  }

  const classifiedOdds = {};
  const availableCategories = [];
  let totalOdds = 0;
  
  // Track which market IDs have been classified to avoid duplicates
  const classifiedMarketIds = new Set();

  // Initialize categories
  Object.values(categories).forEach((category) => {
    classifiedOdds[category.id] = {
      ...category,
      markets_data: {},
      odds_count: 0,
    };
  });

  // Sort categories by priority to ensure consistent classification
  const sortedCategories = Object.values(categories).sort((a, b) => a.priority - b.priority);

  // Classify each market by both market ID and keywords
  Object.entries(oddsData.odds_by_market).forEach(([marketId, marketData]) => {
    // Skip if this market has already been classified
    if (classifiedMarketIds.has(marketId)) {
      return;
    }

    const numericMarketId = parseInt(marketId);
    const marketDescription = marketData.market_description?.toLowerCase() || "";
    let classified = false;

    // Find which category this market belongs to
    for (const category of sortedCategories) {
      // Skip 'others' for classification
      if (category.id === "others") continue;
      
      // Check if market ID matches
      const matchesMarketId = category.markets.includes(numericMarketId);
      
      // Check if market description matches keywords
      const matchesKeywords =
        category.keywords &&
        category.keywords.some((keyword) =>
          marketDescription.includes(keyword.toLowerCase())
        );
        
      if (matchesMarketId || matchesKeywords) {
        classifiedOdds[category.id].markets_data[marketId] = marketData;
        classifiedOdds[category.id].odds_count += marketData.odds.length;
        totalOdds += marketData.odds.length;
        classified = true;
        classifiedMarketIds.add(marketId); // Mark as classified
        break; // Only classify into the first matching category
      }
    }
    
    // If not classified, add to 'others'
    if (!classified) {
      classifiedOdds["others"].markets_data[marketId] = marketData;
      classifiedOdds["others"].odds_count += marketData.odds.length;
      totalOdds += marketData.odds.length;
      classifiedMarketIds.add(marketId); // Mark as classified
    }
  });

  // Filter out empty categories
  Object.keys(classifiedOdds).forEach((categoryId) => {
    if (Object.keys(classifiedOdds[categoryId].markets_data).length > 0) {
      availableCategories.push({
        id: classifiedOdds[categoryId].id,
        label: classifiedOdds[categoryId].label,
        odds_count: classifiedOdds[categoryId].odds_count,
      });
    } else {
      delete classifiedOdds[categoryId];
    }
  });

  return {
    categories: [
      { id: "all", label: "All", odds_count: totalOdds },
      ...availableCategories,
    ],
    classified_odds: classifiedOdds,
    stats: {
      total_categories: availableCategories.length,
      total_odds: totalOdds,
    },
  };
};

// Transform classified odds to betting data format for frontend
const transformToBettingData = (classifiedOdds, matchData = null) => {
  const bettingData = [];

  // Extract team names if available
  const homeTeam = matchData?.participants?.[0]?.name || "Home";
  const awayTeam = matchData?.participants?.[1]?.name || "Away";

  // Track unique market IDs to avoid duplicates
  const processedMarkets = new Set();

  Object.values(classifiedOdds.classified_odds || {}).forEach((category) => {
    Object.entries(category.markets_data || {}).forEach(([marketId, market]) => {
      // Skip if we've already processed this market
      if (processedMarkets.has(marketId)) return;
      processedMarkets.add(marketId);

      // Filter out suspended odds
      const activeOdds = market.odds.filter(odd => !odd.suspended);

      // Only create a section if there are active odds
      if (activeOdds.length > 0) {
        const section = {
          category: category.id,
          title: market.market_description || category.label,
          options: activeOdds.map(odd => ({
            id: odd.id,
            label: odd.label,
            value: parseFloat(odd.value),
            team: odd.team || null,
            suspended: odd.suspended || false,
            marketId: marketId
          }))
        };

        bettingData.push(section);
      }
    });
  });

  return bettingData;
};

const processToScoreInHalf = (odds) => {
    const options = odds.map(odd => {
        // Convert "1st Half"/"2nd Half" to "1H"/"2H"
        const halfIndicator = odd.name === "1st Half" ? "1H" : odd.name === "2nd Half" ? "2H" : "";
        
        return {
            id: odd.id,
            label: odd.label,
            value: Number(odd.dp3),
            halfIndicator: halfIndicator,
            marketId: odd.market_id,
            marketDescription: odd.market_description
        };
    });

    return {
        type: 'to-score-in-half',
        title: 'To Score In Half',
        options: options
    };
};

const processAsianHandicap = (odds) => {
    const options = odds.map(odd => ({
        id: odd.id,
        label: odd.label,
        value: Number(odd.dp3),
        handicapValue: odd.handicap,
        marketId: odd.market_id,
        marketDescription: odd.market_description
    }));

    const isAlternative = odds[0].market_description.toLowerCase().includes('alternative');
    const isFirstHalf = odds[0].market_description.toLowerCase().includes('1st half');

    return {
        type: isAlternative ? 'alternative-asian-handicap' : 'asian-handicap',
        title: odds[0].market_description,
        options: options
    };
};

const processAlternativeGoalLine = (odds) => {
    const options = odds.map(odd => {
        // Get the base type (Over/Under) and values
        const baseType = odd.label.split(' ')[0]; // "Over" or "Under"
        let values;

        // Handle multiple values (e.g., "Over 0.5, 1.0")
        if (odd.label.includes(',')) {
            values = odd.label.substring(odd.label.indexOf(' ') + 1).split(',').map(v => v.trim());
        } else {
            // Handle single value (e.g., "Over 0.5")
            values = [odd.label.split(' ')[1]];
        }

        return {
            id: odd.id,
            label: odd.label, // Keep the original label
            value: Number(odd.dp3),
            thresholds: values,
            marketId: odd.market_id,
            marketDescription: odd.market_description,
            type: 'alternative-goal-line'
        };
    });

    return {
        type: 'alternative-goal-line',
        title: 'Alternative 1st Half Goal Line',
        options: options
    };
};

const processCornerMatchBet = (odds) => {
    const options = odds.map(odd => {
        let label = odd.label;
        // Keep the original numeric labels (1, 2) and only convert "Tie" to "X"
        if (label.toLowerCase() === "tie") {
            label = "X";
        }

        return {
            id: odd.id,
            label: label,
            value: Number(odd.dp3),
            marketId: odd.market_id,
            marketDescription: odd.market_description,
            type: 'corner-match-bet'
        };
    });

    return {
        type: 'corner-match-bet',
        title: 'Corner Match Bet',
        options: options
    };
};

export { classifyOdds, transformToBettingData };

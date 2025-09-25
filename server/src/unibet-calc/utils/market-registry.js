// Market Registry: precise identification rules with precedence to avoid collisions

export const MarketCodes = {
    PLAYER_TO_SCORE: 'PLAYER_TO_SCORE',
    PLAYER_TO_SCORE_2PLUS: 'PLAYER_TO_SCORE_2PLUS',
    PLAYER_SOT_OU: 'PLAYER_SOT_OU',
    PLAYER_CARD_ANY: 'PLAYER_CARD_ANY',
    PLAYER_CARD_RED: 'PLAYER_CARD_RED',

    MATCH_RESULT: 'MATCH_RESULT',
    TEAM_TOTAL_GOALS_OU: 'TEAM_TOTAL_GOALS_OU',
    MATCH_TOTAL_GOALS_OU: 'MATCH_TOTAL_GOALS_OU',
    MATCH_TOTAL_GOALS_INTERVAL_OU: 'MATCH_TOTAL_GOALS_INTERVAL_OU',

    CORNERS_TOTAL_OU: 'CORNERS_TOTAL_OU',
    CORNERS_TEAM_TOTAL_OU: 'CORNERS_TEAM_TOTAL_OU',
    CORNERS_MOST: 'CORNERS_MOST',
    CORNERS_HANDICAP_3WAY: 'CORNERS_HANDICAP_3WAY',
    CORNERS_FIRST_TO_X: 'CORNERS_FIRST_TO_X',

    UNKNOWN: 'UNKNOWN'
};

// Each entry: {code, match: (bet, norm) => boolean, priority}
// Higher priority first to protect specific/player markets from generic totals
export const MARKET_REGISTRY = [
    {
        code: MarketCodes.PLAYER_TO_SCORE_2PLUS,
        priority: 100,
        match: (bet, norm) => {
            const name = norm.marketNameLower;
            const crit = norm.criterionLower;
            const is2plus = name.includes('at least 2') || name.includes('2+');
            const isScorer = (name.includes('to score') || crit.includes('to score')) && !name.includes('team');
            return is2plus && isScorer;
        }
    },
    {
        code: MarketCodes.PLAYER_TO_SCORE,
        priority: 95,
        match: (bet, norm) => {
            const name = norm.marketNameLower;
            const crit = norm.criterionLower;
            const isScorer = (name.includes('to score') || crit.includes('to score')) && !name.includes('team');
            // Ensure it's actually a player market
            return isScorer && (norm.hints.isPlayerOccurrenceLine || norm.hints.hasExplicitPlayer || looksLikePlayerSelection(norm));
        }
    },
    {
        code: MarketCodes.PLAYER_SOT_OU,
        priority: 95,
        match: (bet, norm) => {
            const name = norm.marketNameLower;
            const crit = norm.criterionLower;
            return name.includes("player's shots on target") || crit.includes('shots on target');
        }
    },
    {
        code: MarketCodes.PLAYER_CARD_RED,
        priority: 95,
        match: (bet, norm) => {
            const name = norm.marketNameLower;
            return (name.includes('to get a red card'));
        }
    },
    {
        code: MarketCodes.PLAYER_CARD_ANY,
        priority: 92,
        match: (bet, norm) => {
            const name = norm.marketNameLower;
            const crit = norm.criterionLower;
            return name.includes('to get a card') || crit.includes('to get a card');
        }
    },

    // Match Result (Match regular time)
    {
        code: MarketCodes.MATCH_RESULT,
        priority: 85,
        match: (bet, norm) => {
            const name = norm.marketNameLower;
            return name === 'match (regular time)';
        }
    },

    // Goals totals — protect team totals before match totals, and interval before generic
    {
        code: MarketCodes.TEAM_TOTAL_GOALS_OU,
        priority: 80,
        match: (bet, norm) => {
            const name = norm.marketNameLower;
            // Avoid capturing player totals: require explicit team wording
            // Exclude time window markets (they should be handled by MATCH_TOTAL_GOALS_INTERVAL_OU)
            const hasTimeWindow = norm.hints.hasTimeWindow;
            return (name.includes('total goals by') || name.includes('team total goals')) && !hasTimeWindow;
        }
    },
    {
        code: MarketCodes.MATCH_TOTAL_GOALS_INTERVAL_OU,
        priority: 75,
        match: (bet, norm) => {
            const name = norm.marketNameLower;
            // Handle both match totals and team totals with time windows
            return (name.includes('total goals') || name.includes('goals in')) && norm.hints.hasTimeWindow;
        }
    },
    {
        code: MarketCodes.MATCH_TOTAL_GOALS_OU,
        priority: 70,
        match: (bet, norm) => {
            const name = norm.marketNameLower;
            // Explicitly exclude player hints to avoid collisions
            if (norm.hints.isPlayerMarket || norm.hints.maybePlayerTotalGoals) return false;
            return name.includes('total goals');
        }
    },

    // Corners
    {
        code: MarketCodes.CORNERS_TEAM_TOTAL_OU,
        priority: 60,
        match: (bet, norm) => norm.marketNameLower.includes('team total corners') || norm.marketNameLower.includes('corners by')
    },
    {
        code: MarketCodes.CORNERS_TOTAL_OU,
        priority: 55,
        match: (bet, norm) => norm.marketNameLower.includes('total corners') && !norm.hints.hasTimeWindow
    },
    {
        code: MarketCodes.CORNERS_MOST,
        priority: 55,
        match: (bet, norm) => norm.marketNameLower.includes('most corners')
    },
    {
        code: MarketCodes.CORNERS_HANDICAP_3WAY,
        priority: 55,
        match: (bet, norm) => {
            const n = norm.marketNameLower;
            // Accept variations: "Corners 3-Way Handicap", "3-Way Corners Handicap", etc.
            return (n.includes('3-way') && n.includes('corner') && n.includes('handicap'));
        }
    },
    {
        code: MarketCodes.CORNERS_FIRST_TO_X,
        priority: 50,
        match: (bet, norm) => norm.marketNameLower.includes('first to') && norm.marketNameLower.includes('corners')
    },

    { code: MarketCodes.UNKNOWN, priority: 0, match: () => true }
];

export function identifyMarket(bet, norm) {
    let best = { code: MarketCodes.UNKNOWN, priority: -1 };
    for (const entry of MARKET_REGISTRY) {
        try {
            if (entry.match(bet, norm)) {
                if (entry.priority > best.priority) best = entry;
            }
        } catch (_) {
            // ignore matcher errors
        }
    }
    return best.code;
}

function looksLikePlayerSelection(norm) {
    // If the selection is neither over/under nor yes/no nor team names, it often is a player's name
    const s = norm.hints.selection;
    if (!s) return false;
    const simple = ['over', 'under', 'yes', 'no', '1', '2', 'x', 'home', 'away'];
    if (simple.includes(s)) return false;
    // Contains a space and letters → likely a name
    return /[a-z]/.test(s) && s.includes(' ');
}
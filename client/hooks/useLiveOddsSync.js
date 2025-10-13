import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectLiveMatchesRaw } from '@/lib/features/matches/liveMatchesSlice';
import { selectBets, updateBetOdds, removeBet } from '@/lib/features/betSlip/betSlipSlice';

/**
 * Custom hook to synchronize odds between live matches and betslip
 * This hook listens for odds updates in the live matches data and updates
 * the corresponding bets in the betslip with the new odds values.
 * 
 * @param {string} matchId - The ID of the match to sync odds for
 * @returns {Object} - Object containing match data and bets count for debugging
 */
export const useLiveOddsSync = (matchId) => {
  const dispatch = useDispatch();
  const liveMatches = useSelector(selectLiveMatchesRaw);
  const bets = useSelector(selectBets);

  useEffect(() => {
    if (!liveMatches || !Array.isArray(liveMatches) || liveMatches.length === 0) {
      return;
    }

    // Find the specific live match
    const liveMatch = liveMatches.find(match => match.id === matchId);
    if (!liveMatch || !liveMatch.liveOdds || !liveMatch.liveOdds.outcomes) {
      return;
    }

    console.log(`🔄 [useLiveOddsSync] Syncing odds for live match ${matchId}`);

    // Create a map of oddId to outcome data for quick lookup
    const oddsMap = new Map();
    liveMatch.liveOdds.outcomes.forEach(outcome => {
      // Convert from Kambi API format (13000 -> 13.00) if needed
      const oddsValue = typeof outcome.odds === 'number' ? 
        (outcome.odds > 1000 ? outcome.odds / 1000 : outcome.odds) : 
        parseFloat(outcome.odds);
      
      oddsMap.set(outcome.id, {
        odds: oddsValue,
        status: outcome.status,
        suspended: outcome.status !== 'OPEN'
      });
    });

    // Check each bet in the betslip and update odds or remove if suspended
    bets.forEach(bet => {
      // Only process bets for the current match
      if (bet.match.id === matchId && bet.oddId) {
        const outcomeData = oddsMap.get(bet.oddId);
        
        if (!outcomeData) {
          // Outcome no longer exists, remove the bet
          console.log(`🗑️ [useLiveOddsSync] Removing bet ${bet.id} - outcome no longer exists`);
          dispatch(removeBet(bet.id));
          return;
        }
        
        if (outcomeData.suspended) {
          // Outcome is suspended, remove the bet
          console.log(`⏸️ [useLiveOddsSync] Removing bet ${bet.id} - outcome is suspended`);
          dispatch(removeBet(bet.id));
          return;
        }
        
        // Update odds if they've changed
        const newOdds = outcomeData.odds;
        const currentOdds = bet.odds;
        
        if (Math.abs(newOdds - currentOdds) > 0.001) {
          console.log(`🔄 [useLiveOddsSync] Syncing odds for bet ${bet.id}: ${currentOdds} → ${newOdds}`);
          dispatch(updateBetOdds({
            matchId: bet.match.id,
            oddId: bet.oddId,
            newOdds: newOdds
          }));
        }
      }
    });
  }, [liveMatches, bets, matchId, dispatch]);

  // Return the current live match data for debugging purposes
  const liveMatch = liveMatches?.find(match => match.id === matchId);
  return { 
    liveMatch, 
    betsCount: bets.length,
    hasLiveOdds: liveMatch?.liveOdds?.outcomes?.length > 0
  };
};

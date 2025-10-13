import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateBetOdds, removeBet } from '@/lib/features/betSlip/betSlipSlice';
import { selectMatchDetailV2 } from '@/lib/features/matches/matchesSlice';

/**
 * Custom hook to synchronize odds between match detail page and betslip
 * This hook listens for odds updates in the match detail data and updates
 * the corresponding bets in the betslip with the new odds values.
 */
export const useOddsSync = (matchId) => {
  const dispatch = useDispatch();
  const matchData = useSelector(state => selectMatchDetailV2(state, matchId));
  const bets = useSelector(state => state.betSlip.bets);

  useEffect(() => {
    if (!matchData?.matchData?.data?.betOffers || !bets.length) {
      return;
    }

    // Get all betOffers from the match data
    const betOffers = matchData.matchData.data.betOffers;
    
    // Create a map of oddId to outcome data for quick lookup
    const oddsMap = new Map();
    betOffers.forEach(offer => {
      if (offer.outcomes && Array.isArray(offer.outcomes)) {
        offer.outcomes.forEach(outcome => {
          // Convert from Unibet format (13000 -> 13.00) if needed
          const oddsValue = typeof outcome.odds === 'number' ? 
            (outcome.odds > 1000 ? outcome.odds / 1000 : outcome.odds) : 
            parseFloat(outcome.odds);
          
          oddsMap.set(outcome.id, {
            odds: oddsValue,
            status: outcome.status,
            suspended: outcome.status !== 'OPEN'
          });
        });
      }
    });

    // Check each bet in the betslip and update odds or remove if suspended
    bets.forEach(bet => {
      // Only process bets for the current match
      if (bet.match.id === matchId && bet.oddId) {
        const outcomeData = oddsMap.get(bet.oddId);
        
        if (!outcomeData) {
          // Outcome no longer exists, remove the bet
          console.log(`🗑️ Removing bet ${bet.id} - outcome no longer exists`);
          dispatch(removeBet(bet.id));
          return;
        }
        
        if (outcomeData.suspended) {
          // Outcome is suspended, remove the bet
          console.log(`⏸️ Removing bet ${bet.id} - outcome is suspended`);
          dispatch(removeBet(bet.id));
          return;
        }
        
        // Update odds if they've changed
        const newOdds = outcomeData.odds;
        const currentOdds = bet.odds;
        
        if (Math.abs(newOdds - currentOdds) > 0.001) {
          console.log(`🔄 Syncing odds for bet ${bet.id}: ${currentOdds} → ${newOdds}`);
          dispatch(updateBetOdds({
            matchId: bet.match.id,
            oddId: bet.oddId,
            newOdds: newOdds
          }));
        }
      }
    });
  }, [matchData, bets, matchId, dispatch]);

  // Return the current match data for debugging purposes
  return { matchData, betsCount: bets.length };
};

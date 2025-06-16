import { useDispatch } from 'react-redux';
import { addBet } from '@/lib/features/betSlip/betSlipSlice';

export const useBetting = () => {
  const dispatch = useDispatch();

  const placeBet = (match, selection, odds, type = "1x2") => {
    dispatch(addBet({
      match,
      selection,
      odds,
      type
    }));
  };

  const createBetHandler = (match, selection, odds, type = "1x2") => {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      placeBet(match, selection, odds, type);
    };
  };

  return {
    placeBet,
    createBetHandler
  };
};

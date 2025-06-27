import { useDispatch } from "react-redux";
import { addBet } from "@/lib/features/betSlip/betSlipSlice";

export const useBetting = () => {
  const dispatch = useDispatch();

  const placeBet = (match, selection, odds, type = "1x2", oddId = null) => {
    dispatch(
      addBet({
        match,
        selection,
        odds,
        type,
        oddId,
      })
    );
  };

  const createBetHandler = (
    match,
    selection,
    odds,
    type = "1x2",
    oddId = null
  ) => {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      placeBet(match, selection, odds, type, oddId);
    };
  };

  return {
    placeBet,
    createBetHandler,
  };
};

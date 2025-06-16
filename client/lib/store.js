import { configureStore } from "@reduxjs/toolkit";
import leaguesReducer from "./features/leagues/leaguesSlice";
import matchesReducer from "./features/matches/matchesSlice";
import marketsReducer from "./features/markets/marketsSlice";
import authReducer from "./features/auth/authSlice";
import betSlipReducer from "./features/betSlip/betSlipSlice";
import transactionsReducer from "./features/transactions/transactionsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    leagues: leaguesReducer,
    matches: matchesReducer,
    markets: marketsReducer,
    betSlip: betSlipReducer,
    transactions: transactionsReducer,
  },
});

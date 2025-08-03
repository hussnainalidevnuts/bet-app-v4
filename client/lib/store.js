import { configureStore } from "@reduxjs/toolkit";
import leaguesReducer from "./features/leagues/leaguesSlice";
import matchesReducer from "./features/matches/matchesSlice";
import marketsReducer from "./features/markets/marketsSlice";
import authReducer from "./features/auth/authSlice";
import adminUserReducer from "./features/admin/adminUserSlice";
import betSlipReducer from "./features/betSlip/betSlipSlice";
import transactionsReducer from "./features/transactions/transactionsSlice";
import financeReducer from "./features/finance/financeSlice";
import homeReducer from "./features/home/homeSlice";
import betsReducer from "./features/bets/betsSlice";
import liveMatchesReducer from "./features/matches/liveMatchesSlice";
import websocketReducer from "./features/websocket/websocketSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    home: homeReducer,
    leagues: leaguesReducer,
    matches: matchesReducer,
    markets: marketsReducer,
    betSlip: betSlipReducer,
    transactions: transactionsReducer,
    finance: financeReducer,
    adminUsers: adminUserReducer,
    bets: betsReducer,
    liveMatches: liveMatchesReducer,
    websocket: websocketReducer,
  },
});

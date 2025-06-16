import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// Mock transaction data
const mockTransactions = [
  {
    id: "TXN001",
    type: "deposit",
    amount: 100.00,
    dateTime: "2025-06-15T14:30:00Z",
    status: "completed",
    description: "Credit card deposit"
  },
  {
    id: "TXN002",
    type: "withdrawal",
    amount: -50.00,
    dateTime: "2025-06-14T10:15:00Z",
    status: "completed",
    description: "Bank transfer withdrawal"
  },
  {
    id: "TXN003",
    type: "bet",
    amount: -25.00,
    dateTime: "2025-06-13T16:45:00Z",
    status: "completed",
    description: "Football match bet"
  },
  {
    id: "TXN004",
    type: "win",
    amount: 75.00,
    dateTime: "2025-06-13T18:30:00Z",
    status: "completed",
    description: "Bet winnings"
  },
  {
    id: "TXN005",
    type: "deposit",
    amount: 200.00,
    dateTime: "2025-06-12T12:00:00Z",
    status: "completed",
    description: "Skrill deposit"
  },
  {
    id: "TXN006",
    type: "bet",
    amount: -15.00,
    dateTime: "2025-06-11T20:30:00Z",
    status: "completed",
    description: "Basketball bet"
  },
  {
    id: "TXN007",
    type: "withdrawal",
    amount: -100.00,
    dateTime: "2025-06-10T09:15:00Z",
    status: "pending",
    description: "PayPal withdrawal"
  },
  {
    id: "TXN008",
    type: "deposit",
    amount: 50.00,
    dateTime: "2025-06-09T15:45:00Z",
    status: "completed",
    description: "Credit card deposit"
  }
];

// Mock betting history data
const mockBettingHistory = [
  {
    id: "BET001",
    type: "single",
    amount: -25.00,
    dateTime: "2025-06-15T16:45:00Z",
    status: "won",
    odds: 2.5,
    sport: "Football",
    match: "Manchester United vs Liverpool",
    selection: "Manchester United to win",
    payout: 62.50
  },
  {
    id: "BET002",
    type: "accumulator",
    amount: -10.00,
    dateTime: "2025-06-14T14:30:00Z",
    status: "lost",
    odds: 8.5,
    sport: "Football",
    match: "Multiple matches",
    selection: "3-fold accumulator",
    payout: 0
  },
  {
    id: "BET003",
    type: "single",
    amount: -15.00,
    dateTime: "2025-06-13T19:15:00Z",
    status: "won",
    odds: 1.8,
    sport: "Basketball",
    match: "Lakers vs Warriors",
    selection: "Over 220.5 total points",
    payout: 27.00
  },
  {
    id: "BET004",
    type: "single",
    amount: -20.00,
    dateTime: "2025-06-12T21:00:00Z",
    status: "pending",
    odds: 3.2,
    sport: "Football",
    match: "Barcelona vs Real Madrid",
    selection: "Both teams to score",
    payout: 0
  }
];

// Async thunks for API calls
export const fetchTransactions = createAsyncThunk(
  "transactions/fetchTransactions",
  async (filters = {}, { rejectWithValue }) => {
    try {
      // For now, return mock data
      // TODO: Replace with actual API call when backend is ready
      const { type, dateFrom, dateTo } = filters;
      
      let filteredTransactions = [...mockTransactions];
      
      if (type && type !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === type);
      }
  
      
      if (dateFrom) {
        filteredTransactions = filteredTransactions.filter(t => 
          new Date(t.dateTime) >= new Date(dateFrom)
        );
      }
      
      if (dateTo) {
        filteredTransactions = filteredTransactions.filter(t => 
          new Date(t.dateTime) <= new Date(dateTo)
        );
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        data: filteredTransactions,
        total: filteredTransactions.length
      };
    } catch (error) {
      return rejectWithValue({
        success: false,
        message: "Failed to fetch transactions",
        error: error.message,
      });
    }
  }
);

export const fetchBettingHistory = createAsyncThunk(
  "transactions/fetchBettingHistory",
  async (filters = {}, { rejectWithValue }) => {
    try {      // For now, return mock data
      // TODO: Replace with actual API call when backend is ready
      const { type, dateFrom, dateTo } = filters;
      
      let filteredBets = [...mockBettingHistory];
      
      if (type && type !== 'all') {
        filteredBets = filteredBets.filter(b => b.type === type);
      }
      
      if (dateFrom) {
        filteredBets = filteredBets.filter(b => 
          new Date(b.dateTime) >= new Date(dateFrom)
        );
      }
      
      if (dateTo) {
        filteredBets = filteredBets.filter(b => 
          new Date(b.dateTime) <= new Date(dateTo)
        );
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        data: filteredBets,
        total: filteredBets.length
      };
    } catch (error) {
      return rejectWithValue({
        success: false,
        message: "Failed to fetch betting history",
        error: error.message,
      });
    }
  }
);

const initialState = {
  transactions: [],
  bettingHistory: [],
  loading: false,
  error: null,  filters: {
    type: 'all',
    dateFrom: '',
    dateTo: ''
  },
  total: 0
};

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },resetFilters: (state) => {
      state.filters = {
        type: 'all',
        dateFrom: '',
        dateTo: ''
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch transactions
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message || "Failed to fetch transactions";
      })
      // Fetch betting history
      .addCase(fetchBettingHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBettingHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.bettingHistory = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(fetchBettingHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message || "Failed to fetch betting history";
      });
  },
});

export const { setFilters, clearError, resetFilters } = transactionsSlice.actions;
export default transactionsSlice.reducer;

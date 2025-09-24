import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "@/config/axios";

// Async thunk for fetching live matches from Unibet API
export const fetchLiveMatches = createAsyncThunk(
  "liveMatches/fetchLiveMatches",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/v2/live-matches");
      // Transform the response to match the expected format
      const { matches, upcomingMatches, totalMatches, lastUpdated, warning, cacheAge } = response.data;
      
      // Group live matches by league for the frontend
      const groupedMatches = {};
      matches.forEach(match => {
        const leagueName = match.leagueName || 'Football';
        if (!groupedMatches[leagueName]) {
          groupedMatches[leagueName] = {
            league: leagueName,
            matches: []
          };
        }
        groupedMatches[leagueName].matches.push(match);
      });

      // Group upcoming matches by league for the frontend
      const upcomingGroupedMatches = {};
      upcomingMatches.forEach(match => {
        const leagueName = match.leagueName || 'Football';
        if (!upcomingGroupedMatches[leagueName]) {
          upcomingGroupedMatches[leagueName] = {
            league: leagueName,
            matches: []
          };
        }
        upcomingGroupedMatches[leagueName].matches.push(match);
      });
      
      return {
        matches,
        upcomingMatches,
        groupedMatches: Object.values(groupedMatches),
        upcomingGroupedMatches: Object.values(upcomingGroupedMatches),
        totalMatches,
        totalUpcomingMatches: upcomingMatches.length,
        lastUpdated,
        rawData: response.data
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          "Failed to fetch live matches"
      );
    }
  }
);

// Async thunk for silently updating live matches (no loading state)
export const silentUpdateLiveMatches = createAsyncThunk(
  "liveMatches/silentUpdateLiveMatches",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/v2/live-matches");
      const { matches, upcomingMatches, totalMatches, lastUpdated } = response.data;
      
      // Group live matches by league for the frontend
      const groupedMatches = {};
      matches.forEach(match => {
        const leagueName = match.leagueName || 'Football';
        if (!groupedMatches[leagueName]) {
          groupedMatches[leagueName] = {
            league: leagueName,
            matches: []
          };
        }
        groupedMatches[leagueName].matches.push(match);
      });

      // Group upcoming matches by league for the frontend
      const upcomingGroupedMatches = {};
      upcomingMatches.forEach(match => {
        const leagueName = match.leagueName || 'Football';
        if (!upcomingGroupedMatches[leagueName]) {
          upcomingGroupedMatches[leagueName] = {
            league: leagueName,
            matches: []
          };
        }
        upcomingGroupedMatches[leagueName].matches.push(match);
      });
      
      return {
        matches,
        upcomingMatches,
        groupedMatches: Object.values(groupedMatches),
        upcomingGroupedMatches: Object.values(upcomingGroupedMatches),
        totalMatches,
        totalUpcomingMatches: upcomingMatches.length,
        lastUpdated,
        rawData: response.data
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          "Failed to fetch live matches"
      );
    }
  }
);

const liveMatchesSlice = createSlice({
  name: "liveMatches",
  initialState: {
    data: [], // Array of { league, matches } for live matches
    matches: [], // Raw live matches array
    upcomingMatches: [], // Raw upcoming matches array
    groupedMatches: {}, // Grouped live matches by parent/league
    upcomingGroupedMatches: [], // Grouped upcoming matches by parent/league
    totalMatches: 0,
    totalUpcomingMatches: 0,
    lastUpdated: null,
    warning: null, // Cache warning message
    cacheAge: null, // Cache age in minutes
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLiveMatches.pending, (state) => {
        // Only show loading if we don't have existing data (initial load)
        if (state.data.length === 0) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchLiveMatches.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.groupedMatches;
        state.matches = action.payload.matches;
        state.upcomingMatches = action.payload.upcomingMatches;
        state.groupedMatches = action.payload.groupedMatches;
        state.upcomingGroupedMatches = action.payload.upcomingGroupedMatches;
        state.totalMatches = action.payload.totalMatches;
        state.totalUpcomingMatches = action.payload.totalUpcomingMatches;
        state.lastUpdated = action.payload.lastUpdated;
        state.warning = action.payload.warning;
        state.cacheAge = action.payload.cacheAge;
      })
      .addCase(fetchLiveMatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Silent live matches update (no loading state changes)
      .addCase(silentUpdateLiveMatches.fulfilled, (state, action) => {
        state.data = action.payload.groupedMatches;
        state.matches = action.payload.matches;
        state.upcomingMatches = action.payload.upcomingMatches;
        state.groupedMatches = action.payload.groupedMatches;
        state.upcomingGroupedMatches = action.payload.upcomingGroupedMatches;
        state.totalMatches = action.payload.totalMatches;
        state.totalUpcomingMatches = action.payload.totalUpcomingMatches;
        state.lastUpdated = action.payload.lastUpdated;
        state.warning = action.payload.warning;
        state.cacheAge = action.payload.cacheAge;
        // Clear any existing errors since update was successful
        state.error = null;
      })
      .addCase(silentUpdateLiveMatches.rejected, (state, action) => {
        // Don't update loading state, just log the error silently
        console.warn('Silent live matches update failed:', action.payload);
      });
  },
});

export default liveMatchesSlice.reducer;

// Selectors
export const selectLiveMatches = (state) => state.liveMatches.data;
export const selectLiveMatchesRaw = (state) => state.liveMatches.matches;
export const selectUpcomingMatchesRaw = (state) => state.liveMatches.upcomingMatches;
export const selectLiveMatchesGrouped = (state) => state.liveMatches.groupedMatches;
export const selectUpcomingMatchesGrouped = (state) => state.liveMatches.upcomingGroupedMatches;
export const selectLiveMatchesTotal = (state) => state.liveMatches.totalMatches;
export const selectUpcomingMatchesTotal = (state) => state.liveMatches.totalUpcomingMatches;
export const selectLiveMatchesLastUpdated = (state) => state.liveMatches.lastUpdated;
export const selectLiveMatchesWarning = (state) => state.liveMatches.warning;
export const selectLiveMatchesCacheAge = (state) => state.liveMatches.cacheAge;
export const selectLiveMatchesLoading = (state) => state.liveMatches.loading;
export const selectLiveMatchesError = (state) => state.liveMatches.error; 
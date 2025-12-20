import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import matchesService from "@/services/matches.service"; // Use matches service for direct Unibet calls

// Async thunk for fetching live matches from Unibet API (DIRECT - no backend)
export const fetchLiveMatches = createAsyncThunk(
  "liveMatches/fetchLiveMatches",
  async (_, { rejectWithValue }) => {
    try {
      // ✅ DIRECT CALL: Frontend → Unibet API (no backend)
      const response = await matchesService.getLiveMatchesV2();
      // Transform the response to match the expected format
      const { matches, upcomingMatches, totalMatches, lastUpdated, warning, cacheAge } = response;
      
      console.log('🔍 Redux slice received matches:', matches.length, 'first match kambiLiveData:', matches[0]?.kambiLiveData);
      
      // Group live matches by league for the frontend
      const groupedMatches = {};
      matches.forEach(match => {
        // Create unique league identifier by combining league name and country
        const leagueName = match.leagueName || 'Football';
        const country = match.parentName || 'Unknown';
        const uniqueLeagueKey = `${leagueName} (${country})`;
        
        if (!groupedMatches[uniqueLeagueKey]) {
          groupedMatches[uniqueLeagueKey] = {
            league: uniqueLeagueKey, // Use the unique key as display name
            leagueName: leagueName,  // Keep original league name
            country: country,        // Keep country info
            matches: []
          };
        }
        groupedMatches[uniqueLeagueKey].matches.push(match);
      });

      // Group upcoming matches by league for the frontend
      const upcomingGroupedMatches = {};
      upcomingMatches.forEach(match => {
        // Create unique league identifier by combining league name and country
        const leagueName = match.leagueName || 'Football';
        const country = match.parentName || 'Unknown';
        const uniqueLeagueKey = `${leagueName} (${country})`;
        
        if (!upcomingGroupedMatches[uniqueLeagueKey]) {
          upcomingGroupedMatches[uniqueLeagueKey] = {
            league: uniqueLeagueKey, // Use the unique key as display name
            leagueName: leagueName,  // Keep original league name
            country: country,        // Keep country info
            matches: []
          };
        }
        upcomingGroupedMatches[uniqueLeagueKey].matches.push(match);
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

// Async thunk for silently updating live matches (no loading state) - DIRECT Unibet call
export const silentUpdateLiveMatches = createAsyncThunk(
  "liveMatches/silentUpdateLiveMatches",
  async (_, { rejectWithValue }) => {
    try {
      // ✅ DIRECT CALL: Frontend → Unibet API (no backend)
      const response = await matchesService.getLiveMatchesV2();
      const { matches, upcomingMatches, totalMatches, lastUpdated } = response;
      
      // Group live matches by league for the frontend
      const groupedMatches = {};
      matches.forEach(match => {
        // Create unique league identifier by combining league name and country
        const leagueName = match.leagueName || 'Football';
        const country = match.parentName || 'Unknown';
        const uniqueLeagueKey = `${leagueName} (${country})`;
        
        if (!groupedMatches[uniqueLeagueKey]) {
          groupedMatches[uniqueLeagueKey] = {
            league: uniqueLeagueKey, // Use the unique key as display name
            leagueName: leagueName,  // Keep original league name
            country: country,        // Keep country info
            matches: []
          };
        }
        groupedMatches[uniqueLeagueKey].matches.push(match);
      });

      // Group upcoming matches by league for the frontend
      const upcomingGroupedMatches = {};
      upcomingMatches.forEach(match => {
        // Create unique league identifier by combining league name and country
        const leagueName = match.leagueName || 'Football';
        const country = match.parentName || 'Unknown';
        const uniqueLeagueKey = `${leagueName} (${country})`;
        
        if (!upcomingGroupedMatches[uniqueLeagueKey]) {
          upcomingGroupedMatches[uniqueLeagueKey] = {
            league: uniqueLeagueKey, // Use the unique key as display name
            leagueName: leagueName,  // Keep original league name
            country: country,        // Keep country info
            matches: []
          };
        }
        upcomingGroupedMatches[uniqueLeagueKey].matches.push(match);
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
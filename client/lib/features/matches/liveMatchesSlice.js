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

// Async thunk to fetch betoffers for live matches (optimized with batching)
export const fetchBetOffersForLiveMatches = createAsyncThunk(
  "liveMatches/fetchBetOffersForLiveMatches",
  async (matchIds, { rejectWithValue }) => {
    try {
      if (!matchIds || matchIds.length === 0) {
        return {};
      }
      
      // Limit to max 10 matches at once to prevent overload and reduce delay
      const limitedMatchIds = matchIds.slice(0, 10);
      
      console.log(`🔍 [BETOFFERS] Fetching betoffers for ${limitedMatchIds.length} matches in parallel...`);
      
      // Fetch betoffers with timeout (2 seconds per match max) to prevent long delays
      const betOffersPromises = limitedMatchIds.map(matchId => 
        Promise.race([
          matchesService.getBetOffersV2(matchId, { silent: true }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 2000)
          )
        ]).catch(error => {
          console.warn(`⚠️ [BETOFFERS] Failed to fetch betoffers for match ${matchId}:`, error.message);
          return null; // Return null for failed requests
        })
      );
      
      const betOffersResults = await Promise.all(betOffersPromises);
      
      // Create a map of matchId -> betOffers
      const betOffersMap = {};
      limitedMatchIds.forEach((matchId, index) => {
        const result = betOffersResults[index];
        if (result && result.success && result.data?.betOffers) {
          betOffersMap[matchId] = result.data.betOffers;
        }
      });
      
      console.log(`✅ [BETOFFERS] Successfully fetched betoffers for ${Object.keys(betOffersMap).length}/${limitedMatchIds.length} matches`);
      
      return betOffersMap;
    } catch (error) {
      console.error('❌ [BETOFFERS] Error fetching betoffers:', error);
      return rejectWithValue(error.message || "Failed to fetch betoffers");
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
      
      // Handle null response (timeout) gracefully
      if (!response || !response.matches) {
        return rejectWithValue("Timeout - will retry on next poll");
      }
      
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
        timestamp: Date.now(), // Numeric timestamp for millisecond-precision comparison
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
    timestamp: 0, // Numeric timestamp for millisecond-precision comparison
    warning: null, // Cache warning message
    cacheAge: null, // Cache age in minutes
    loading: false,
    error: null,
    matchBetOffers: {}, // Store betoffers per match: { matchId: betOffers[] } - exactly like match details page
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
        state.timestamp = action.payload.timestamp || (action.payload.lastUpdated ? new Date(action.payload.lastUpdated).getTime() : Date.now());
        state.warning = action.payload.warning;
        state.cacheAge = action.payload.cacheAge;
      })
      .addCase(fetchLiveMatches.rejected, (state, action) => {
        state.loading = false;
        // ✅ FIX: Only set error if we don't have existing data
        // If we have existing data, keep it and don't show error (silent failure)
        if (state.data.length === 0 && state.matches.length === 0) {
          // Only show error on initial load failure
          state.error = action.payload;
        } else {
          // If we have existing data, don't overwrite with error (allows retry)
          console.warn('⚠️ Live matches fetch failed, but keeping existing data:', action.payload);
          // Keep existing data visible, don't set error
        }
      })
      // Silent live matches update (no loading state changes)
      .addCase(silentUpdateLiveMatches.fulfilled, (state, action) => {
        // Only update if we got valid data (not null from timeout)
        if (action.payload && action.payload.matches) {
          // Timestamp-based comparison: Use numeric timestamp for millisecond-precision comparison
          const newTimestamp = action.payload.timestamp || (action.payload.lastUpdated ? new Date(action.payload.lastUpdated).getTime() : 0);
          const currentTimestamp = state.timestamp || 0;
          
          // Strict comparison: Only update if new data is STRICTLY newer (prevents flickering from stale responses)
          if (newTimestamp > currentTimestamp) {
            state.data = action.payload.groupedMatches;
            state.matches = action.payload.matches;
            state.upcomingMatches = action.payload.upcomingMatches;
            state.groupedMatches = action.payload.groupedMatches;
            state.upcomingGroupedMatches = action.payload.upcomingGroupedMatches;
            state.totalMatches = action.payload.totalMatches;
            state.totalUpcomingMatches = action.payload.totalUpcomingMatches;
            state.lastUpdated = action.payload.lastUpdated;
            state.timestamp = newTimestamp;
            state.warning = action.payload.warning;
            state.cacheAge = action.payload.cacheAge;
            // Clear any existing errors since update was successful
            state.error = null;
          } else {
            // Ignore stale data - don't update if timestamp is older or equal
            console.warn(`⚠️ Ignoring stale data (timestamp: ${newTimestamp} <= ${currentTimestamp})`);
          }
        }
        // If payload is null/undefined (timeout), keep existing data (don't update)
      })
      .addCase(silentUpdateLiveMatches.rejected, (state, action) => {
        // Don't update loading state, just log the error silently
        // Keep existing data - don't clear it on timeout/network errors
        console.warn('Silent live matches update failed:', action.payload);
        // Don't update state - keep previous data visible
      })
      // Add betoffers to state (exactly like match details page)
      .addCase(fetchBetOffersForLiveMatches.fulfilled, (state, action) => {
        state.matchBetOffers = { ...state.matchBetOffers, ...action.payload };
      })
      .addCase(fetchBetOffersForLiveMatches.rejected, (state, action) => {
        // Silent failure - don't update state
        console.warn('Failed to fetch betoffers for live matches:', action.payload);
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
export const selectMatchBetOffers = (state, matchId) => state.liveMatches.matchBetOffers[matchId]; 
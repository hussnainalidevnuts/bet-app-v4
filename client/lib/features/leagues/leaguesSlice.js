import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "@/config/axios";

// Fallback leagues data
const fallbackLeagues = [
  {
    id: 1,
    name: "Premier League",
    image_path: null,
    country: { name: "England" },
    isPopular: true,
    popularOrder: 0
  },
  {
    id: 2,
    name: "La Liga",
    image_path: null,
    country: { name: "Spain" },
    isPopular: true,
    popularOrder: 1
  },
  {
    id: 3,
    name: "Serie A",
    image_path: null,
    country: { name: "Italy" },
    isPopular: true,
    popularOrder: 2
  },
  {
    id: 4,
    name: "Bundesliga",
    image_path: null,
    country: { name: "Germany" },
    isPopular: true,
    popularOrder: 3
  },
  {
    id: 5,
    name: "Ligue 1",
    image_path: null,
    country: { name: "France" },
    isPopular: true,
    popularOrder: 4
  }
];

// Async thunk for fetching popular leagues for sidebar
export const fetchPopularLeagues = createAsyncThunk(
  "leagues/fetchPopularLeagues",
  async (_, { rejectWithValue }) => {
    try {
      console.log("🔄 Fetching leagues from CSV file...");

      // Use new admin endpoint that serves leagues from CSV
      const response = await apiClient.get("/admin/leagues");
      console.log("📡 API Response:", response.data);

      const leagues = response.data.data;
      console.log(`✅ Loaded ${leagues.length} leagues from CSV`);
      return leagues;
    } catch (error) {
      // Return fallback data if API fails
      console.error("❌ Failed to fetch leagues from CSV:", error);
      console.warn("🔄 Using fallback data instead");
      return fallbackLeagues;
    }
  }
);

// Async thunk for updating league popularity
export const updateLeaguePopularity = createAsyncThunk(
  "leagues/updateLeaguePopularity",
  async (leagues, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/admin/leagues/popular", {
        leagues: leagues
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
        "Failed to update league popularity"
      );
    }
  }
);

// Async thunk for fetching matches by league - Updated to use Unibet API
export const fetchMatchesByLeague = createAsyncThunk(
  "leagues/fetchMatchesByLeague",
  async (leagueId, { rejectWithValue }) => {
    try {
      console.log(`🔍 Fetching matches for league: ${leagueId}`);
      
      // Use the new Unibet live matches API
      const response = await apiClient.get('/v2/live-matches');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch matches');
      }
      
      // Filter matches by the specific league
      const allMatches = response.data.allMatches || [];
      console.log(`📊 Total matches available: ${allMatches.length}`);
      console.log(`🔍 Looking for league ID: ${leagueId} (type: ${typeof leagueId})`);
      
      // Show available league IDs for debugging
      const availableLeagueIds = [...new Set(allMatches.map(match => match.groupId))];
      console.log(`📋 Available league IDs in matches:`, availableLeagueIds.slice(0, 10));
      
      const leagueMatches = allMatches.filter(match => {
        // Check if match belongs to the requested league
        const matches = match.groupId === leagueId || match.group === leagueId || match.groupId === leagueId.toString() || match.groupId === parseInt(leagueId);
        if (matches) {
          console.log(`✅ Found match for league: ${match.homeName} vs ${match.awayName} (groupId: ${match.groupId})`);
        }
        return matches;
      });
      
      console.log(`📊 Matches found for league ${leagueId}: ${leagueMatches.length}`);
      
      // If no matches found, return empty result
      if (leagueMatches.length === 0) {
        console.log(`⚠️ No matches found for league ${leagueId}. Returning empty result.`);
        return { 
          league: { id: leagueId, name: `League ${leagueId}` }, 
          matches: [] 
        };
      }
      
      // Transform the data to match the expected format (with participants array)
      const transformedMatches = leagueMatches.map(match => ({
        id: match.id,
        starting_at: match.start,
        participants: [
          {
            name: match.homeName,
            image_path: null // Unibet API doesn't provide team images
          },
          {
            name: match.awayName,
            image_path: null
          }
        ],
        league: {
          id: match.groupId,
          name: match.group
        }
      }));
      
      // Find the league info
      const leagueInfo = leagueMatches.length > 0 ? {
        id: leagueMatches[0].groupId,
        name: leagueMatches[0].group
      } : {
        id: leagueId,
        name: `League ${leagueId}`
      };
      
      return { 
        league: leagueInfo, 
        matches: transformedMatches 
      };
    } catch (error) {
      console.error('❌ Error fetching matches by league:', error);
      return rejectWithValue(
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch matches for league"
      );
    }
  }
);

const leaguesSlice = createSlice({
  name: "leagues",
  initialState: {
    data: [],
    popularLeagues: [],
    loading: false,
    popularLoading: false,
    error: null,
    selectedLeague: null,
    matchesByLeague: {},
    matchesLoading: false,
    matchesError: null,
    updateLoading: false,
    updateError: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.matchesError = null;
      state.updateError = null;
    },
    setSelectedLeague: (state, action) => {
      state.selectedLeague = action.payload;
    },
    clearSelectedLeague: (state) => {
      state.selectedLeague = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Popular leagues cases
      .addCase(fetchPopularLeagues.pending, (state) => {
        state.popularLoading = true;
        state.error = null;
      })
      .addCase(fetchPopularLeagues.fulfilled, (state, action) => {
        state.popularLoading = false;
        state.popularLeagues = action.payload;
      })
      .addCase(fetchPopularLeagues.rejected, (state, action) => {
        state.popularLoading = false;
        state.error = action.payload;
      })
      // Update league popularity cases
      .addCase(updateLeaguePopularity.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
      })
      .addCase(updateLeaguePopularity.fulfilled, (state, action) => {
        state.updateLoading = false;
        // The leagues will be refreshed by calling fetchPopularLeagues after this
      })
      .addCase(updateLeaguePopularity.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload;
      })
      // Matches by league cases
      .addCase(fetchMatchesByLeague.pending, (state) => {
        state.matchesLoading = true;
        state.matchesError = null;
      })
      .addCase(fetchMatchesByLeague.fulfilled, (state, action) => {
        state.matchesLoading = false;

        const { league, matches } = action.payload;
        state.matchesByLeague[league.id] = { matches, league };
      })
      .addCase(fetchMatchesByLeague.rejected, (state, action) => {
        state.matchesLoading = false;
        state.matchesError = action.payload;
      });
  },
});

export const { clearError, setSelectedLeague, clearSelectedLeague } =
  leaguesSlice.actions;
export default leaguesSlice.reducer;

// Selectors
export const selectLeagues = (state) => state.leagues.data;
export const selectLeaguesLoading = (state) => state.leagues.loading;
export const selectLeaguesError = (state) => state.leagues.error;
export const selectSelectedLeague = (state) => state.leagues.selectedLeague;
export const selectPopularLeagues = (state) => state.leagues.popularLeagues;
export const selectPopularLeaguesLoading = (state) =>
  state.leagues.popularLoading;
export const selectUpdateLoading = (state) => state.leagues.updateLoading;
export const selectUpdateError = (state) => state.leagues.updateError;

export const selectMatchesByLeague = (state, leagueId) =>
  state.leagues.matchesByLeague[leagueId] || [];

export const selectMatchesLoading = (state) => state.leagues.matchesLoading;
export const selectMatchesError = (state) => state.leagues.matchesError;

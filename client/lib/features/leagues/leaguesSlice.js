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
      console.log("Fetching popular leagues for sidebar...");

      // Updated endpoint to fetch leagues with isPopular flag
      const response = await apiClient.get("/fixtures/leagues/popular");

      const leagues = response.data.data;
      return leagues;
    } catch (error) {
      // Return fallback data if API fails

      console.warn(
        "Failed to fetch popular leagues, using fallback data:",
        error
      );
      return fallbackLeagues;
    }
  }
);

// Async thunk for updating league popularity
export const updateLeaguePopularity = createAsyncThunk(
  "leagues/updateLeaguePopularity",
  async (leagues, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/fixtures/leagues/popular", {
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

// Async thunk for fetching matches by league
export const fetchMatchesByLeague = createAsyncThunk(
  "leagues/fetchMatchesByLeague",
  async (leagueId, { rejectWithValue }) => {
    try {
      console.log("HELLLOOOOO");
      const response = await apiClient.get(`/fixtures/league/${leagueId}`);

      return { league: response.data.league, matches: response.data.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
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

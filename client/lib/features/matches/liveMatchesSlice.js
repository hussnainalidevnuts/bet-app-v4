import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "@/config/axios";

// Async thunk for fetching live matches grouped by league
export const fetchLiveMatches = createAsyncThunk(
  "liveMatches/fetchLiveMatches",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/fixtures/live");
      // Expecting response.data to be an array of { league, matches }
      return response.data;
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
    data: [], // Array of { league, matches }
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLiveMatches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLiveMatches.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchLiveMatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default liveMatchesSlice.reducer;

// Selectors
export const selectLiveMatches = (state) => state.liveMatches.data;
export const selectLiveMatchesLoading = (state) => state.liveMatches.loading;
export const selectLiveMatchesError = (state) => state.liveMatches.error; 
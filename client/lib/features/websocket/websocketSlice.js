import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isConnected: false,
  liveOdds: {}, // { matchId: { odds: [], classification: {}, timestamp: string } }
  liveMatches: [],
  lastUpdate: null,
  connectionStatus: 'disconnected', // 'connecting', 'connected', 'disconnected', 'error'
};

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    // Connection status
    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload;
      state.isConnected = action.payload === 'connected';
    },
    
    // Live odds updates
    updateLiveOdds: (state, action) => {
      const { matchId, odds, classification, timestamp } = action.payload;
      state.liveOdds[matchId] = {
        odds: odds || [],
        classification: classification || {},
        timestamp: timestamp || new Date().toISOString()
      };
      state.lastUpdate = new Date().toISOString();
    },
    
    // Live matches updates
    updateLiveMatches: (state, action) => {
      state.liveMatches = action.payload.matches || [];
      state.lastUpdate = new Date().toISOString();
    },
    
    // Clear specific match odds
    clearMatchOdds: (state, action) => {
      const matchId = action.payload;
      delete state.liveOdds[matchId];
    },
    
    // Clear all data
    clearAllData: (state) => {
      state.liveOdds = {};
      state.liveMatches = [];
      state.lastUpdate = null;
    },
    
    // Update multiple odds at once
    updateMultipleOdds: (state, action) => {
      const updates = action.payload;
      updates.forEach(update => {
        const { matchId, odds, classification, timestamp } = update;
        state.liveOdds[matchId] = {
          odds: odds || [],
          classification: classification || {},
          timestamp: timestamp || new Date().toISOString()
        };
      });
      state.lastUpdate = new Date().toISOString();
    }
  }
});

export const {
  setConnectionStatus,
  updateLiveOdds,
  updateLiveMatches,
  clearMatchOdds,
  clearAllData,
  updateMultipleOdds
} = websocketSlice.actions;

// Selectors
export const selectWebSocketConnection = (state) => state.websocket.connectionStatus;
export const selectIsConnected = (state) => state.websocket.isConnected;
export const selectLiveOdds = (state) => state.websocket.liveOdds;
export const selectLiveMatches = (state) => state.websocket.liveMatches;
export const selectLastUpdate = (state) => state.websocket.lastUpdate;

// Selector for specific match odds
export const selectMatchOdds = (state, matchId) => {
  return state.websocket.liveOdds[matchId] || {
    odds: [],
    classification: {},
    timestamp: null
  };
};

// Selector for match odds classification
export const selectMatchOddsClassification = (state, matchId) => {
  return state.websocket.liveOdds[matchId]?.classification || {};
};

// Selector for main odds (1X2) from live odds
export const selectMainOdds = (state, matchId) => {
  const matchOdds = state.websocket.liveOdds[matchId];
  if (!matchOdds || !matchOdds.odds) return {};
  
  // The backend now sends extracted main odds directly
  return {
    home: matchOdds.odds.home?.value || null,
    draw: matchOdds.odds.draw?.value || null,
    away: matchOdds.odds.away?.value || null
  };
};

export default websocketSlice.reducer; 
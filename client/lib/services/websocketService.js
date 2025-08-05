import { io } from 'socket.io-client';
import { store } from '../store';
import { 
  setConnectionStatus, 
  updateLiveOdds, 
  updateLiveMatches
} from '../features/websocket/websocketSlice';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;

    // Create Socket.IO connection
    this.socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    // Connection events
    this.socket.on('connect', () => {
      store.dispatch(setConnectionStatus('connected'));
      
      // Join live matches room by default
      this.socket.emit('joinLiveMatches');
    });

    this.socket.on('disconnect', () => {
      store.dispatch(setConnectionStatus('disconnected'));
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      store.dispatch(setConnectionStatus('error'));
    });

    // Live odds updates
    this.socket.on('liveOddsUpdate', (data) => {
      // Log the complete odds data
      console.log('📊 [ODDS UPDATE] Match:', data.matchId);
      console.log('📊 [ODDS DATA] Complete odds:', data.odds);
      console.log('📊 [CLASSIFICATION] Odds classification:', data.classification);
      console.log('📊 [TIMESTAMP] Update time:', data.timestamp);
      console.log('---');
      
      store.dispatch(updateLiveOdds({
        matchId: data.matchId,
        odds: data.odds,
        classification: data.classification,
        timestamp: data.timestamp
      }));
    });

    // Live matches updates
    this.socket.on('liveMatchesUpdate', (data) => {
      store.dispatch(updateLiveMatches(data));
      
      // Automatically join match rooms for all live matches
      const leagueGroups = data.matches || [];
      leagueGroups.forEach(leagueGroup => {
        if (leagueGroup.matches && Array.isArray(leagueGroup.matches)) {
          leagueGroup.matches.forEach(match => {
            if (match.id) {
              this.socket.emit('joinMatch', match.id);
            }
          });
        }
      });
    });

    // Multiple odds updates (for initial connection)
    this.socket.on('multipleOddsUpdate', (updates) => {
      console.log('📊 [MULTIPLE ODDS] Received', updates.length, 'odds updates:');
      // Dispatch individual updates instead of using updateMultipleOdds
      updates.forEach((update, index) => {
        console.log(`📊 [ODDS UPDATE ${index + 1}] Match:`, update.matchId);
        console.log('📊 [ODDS DATA] Complete odds:', update.odds);
        console.log('📊 [CLASSIFICATION] Odds classification:', update.classification);
        console.log('📊 [TIMESTAMP] Update time:', update.timestamp);
        console.log('---');
        
        store.dispatch(updateLiveOdds({
          matchId: update.matchId,
          odds: update.odds,
          classification: update.classification,
          timestamp: update.timestamp
        }));
      });
    });

    this.isInitialized = true;
  }

  // Join specific match room
  joinMatch(matchId) {
    if (this.socket) {
      this.socket.emit('joinMatch', matchId);
    }
  }

  // Leave specific match room
  leaveMatch(matchId) {
    if (this.socket) {
      this.socket.emit('leaveMatch', matchId);
    }
  }

  // Join live matches room
  joinLiveMatches() {
    if (this.socket) {
      this.socket.emit('joinLiveMatches');
    }
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
    }
  }

  // Get connection status
  isConnected() {
    return this.socket?.connected || false;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService; 
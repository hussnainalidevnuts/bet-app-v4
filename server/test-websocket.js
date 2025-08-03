const { io } = require('socket.io-client');

// Test WebSocket connection
const socket = io('http://localhost:4000', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server:', socket.id);
  
  // Join live matches room
  socket.emit('joinLiveMatches');
  
  // Join specific match room
  socket.emit('joinMatch', '19441640');
});

socket.on('liveOddsUpdate', (data) => {
  console.log('📡 Received live odds update:', {
    matchId: data.matchId,
    oddsCount: data.odds?.length || 0,
    timestamp: data.timestamp
  });
});

socket.on('liveMatchesUpdate', (data) => {
  console.log('📡 Received live matches update:', {
    matchesCount: data.matches?.length || 0,
    timestamp: data.timestamp
  });
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from WebSocket server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});

// Keep the connection alive
setInterval(() => {
  console.log('💓 WebSocket connection alive...');
}, 10000);

console.log('🧪 WebSocket test client started. Waiting for updates...'); 
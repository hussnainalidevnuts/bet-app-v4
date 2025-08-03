import { Server } from 'socket.io';

let io = null;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
    
    // Join live matches room
    socket.on('joinLiveMatches', () => {
      socket.join('liveMatches');
      console.log(`👥 Socket ${socket.id} joined liveMatches room`);
    });
    
    // Join specific match room
    socket.on('joinMatch', (matchId) => {
      socket.join(`match_${matchId}`);
      console.log(`👥 Socket ${socket.id} joined match_${matchId} room`);
    });
    
    // Leave specific match room
    socket.on('leaveMatch', (matchId) => {
      socket.leave(`match_${matchId}`);
      console.log(`👋 Socket ${socket.id} left match_${matchId} room`);
    });
    
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  console.log('🔌 Socket.IO server initialized');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

export const setIO = (socketIO) => {
  io = socketIO;
}; 
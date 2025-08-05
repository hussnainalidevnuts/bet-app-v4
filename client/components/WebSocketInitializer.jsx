'use client';

import { useEffect } from 'react';
import websocketService from '@/lib/services/websocketService';

const WebSocketInitializer = () => {
  useEffect(() => {
    // Initialize WebSocket connection early
    websocketService.initialize();
    
    // Join live matches room by default
    websocketService.joinLiveMatches();
    
    // Cleanup on unmount
    return () => {
      // Don't disconnect here as other components might be using the socket
    };
  }, []);

  return null; // This component doesn't render anything
};

export default WebSocketInitializer; 
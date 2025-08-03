'use client';

import { useEffect } from 'react';
import websocketService from '@/lib/services/websocketService';

const WebSocketInitializer = () => {
  useEffect(() => {
    // Initialize WebSocket service when component mounts
    websocketService.initialize();

    // Cleanup when component unmounts
    return () => {
      websocketService.disconnect();
    };
  }, []);

  return null; // This component doesn't render anything
};

export default WebSocketInitializer; 
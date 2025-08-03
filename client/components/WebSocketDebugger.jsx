'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  selectWebSocketConnection, 
  selectLiveOdds, 
  selectLiveMatches,
  selectLastUpdate 
} from '@/lib/features/websocket/websocketSlice';

const WebSocketDebugger = () => {
  const [isVisible, setIsVisible] = useState(false);
  const connectionStatus = useSelector(selectWebSocketConnection);
  const liveOdds = useSelector(selectLiveOdds);
  const liveMatches = useSelector(selectLiveMatches);
  const lastUpdate = useSelector(selectLastUpdate);

  // Toggle visibility with Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible(!isVisible);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 bg-black text-white p-4 rounded-lg shadow-lg z-50 max-w-md text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">WebSocket Debugger</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <div>
          <strong>Connection:</strong> 
          <span className={`ml-2 px-2 py-1 rounded text-xs ${
            connectionStatus === 'connected' ? 'bg-green-600' : 
            connectionStatus === 'connecting' ? 'bg-yellow-600' : 
            'bg-red-600'
          }`}>
            {connectionStatus}
          </span>
        </div>
        
        <div>
          <strong>Last Update:</strong> {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
        </div>
        
        <div>
          <strong>Live Matches:</strong> {liveMatches.length}
        </div>
        
        <div>
          <strong>Live Odds:</strong> {Object.keys(liveOdds).length} matches
        </div>
        
        {Object.keys(liveOdds).length > 0 && (
          <div className="mt-2">
            <strong>Odds Details:</strong>
            {Object.entries(liveOdds).slice(0, 3).map(([matchId, oddsData]) => (
              <div key={matchId} className="ml-2 text-gray-300">
                Match {matchId}: {JSON.stringify(oddsData.odds)}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-2 text-gray-400 text-xs">
        Press Ctrl+Shift+D to toggle
      </div>
    </div>
  );
};

export default WebSocketDebugger; 
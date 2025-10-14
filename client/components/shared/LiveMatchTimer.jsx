'use client';

import React, { useState, useEffect, useRef } from 'react';
import apiClient from '@/config/axios';

const LiveMatchTimer = ({ matchId, initialTime = null, initialPeriod = null, isRunning = false }) => {
    const [currentTime, setCurrentTime] = useState(initialTime || { minute: 0, second: 0 });
    const [currentPeriod, setCurrentPeriod] = useState(initialPeriod || '1st half');
    const [isLive, setIsLive] = useState(isRunning);
    const [lastSyncTime, setLastSyncTime] = useState(Date.now());
    
    const intervalRef = useRef(null);
    const syncIntervalRef = useRef(null);

    // Client-side timer that updates every second
    useEffect(() => {
        if (isLive) {
            intervalRef.current = setInterval(() => {
                setCurrentTime(prev => {
                    const newSecond = prev.second + 1;
                    if (newSecond >= 60) {
                        return { minute: prev.minute + 1, second: 0 };
                    }
                    return { minute: prev.minute, second: newSecond };
                });
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isLive]);

    // API sync every 45 seconds
    useEffect(() => {
        const syncWithAPI = async () => {
            try {
                console.log(`🔄 LiveMatchTimer: Syncing with API for match ${matchId}`);
                const response = await apiClient.get(`/matches/${matchId}/live`);
                
                if (response.data.success && response.data.liveData) {
                    const { matchClock, score } = response.data.liveData;
                    
                    if (matchClock) {
                        setCurrentTime({
                            minute: matchClock.minute || 0,
                            second: matchClock.second || 0
                        });
                        setCurrentPeriod(matchClock.period || '1st half');
                        setIsLive(matchClock.running || false);
                        setLastSyncTime(Date.now());
                        
                        console.log(`✅ LiveMatchTimer: Synced - ${matchClock.minute}' ${matchClock.period} (running: ${matchClock.running})`);
                    }
                }
            } catch (error) {
                console.warn(`⚠️ LiveMatchTimer: Failed to sync with API for match ${matchId}:`, error.message);
            }
        };

        // Initial sync
        syncWithAPI();

        // Set up periodic sync every 45 seconds
        syncIntervalRef.current = setInterval(syncWithAPI, 45000);

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, [matchId]);

    // Format time display
    const formatTime = () => {
        const minute = currentTime.minute || 0;
        const second = currentTime.second || 0;
        
        if (second > 0) {
            return `${minute}'${second.toString().padStart(2, '0')}`;
        }
        return `${minute}'`;
    };

    // Never show period - just show the time
    return (
        <div className="text-xs">
            <span className="text-red-600 font-medium">
                {formatTime()}
            </span>
        </div>
    );
};

export default LiveMatchTimer;

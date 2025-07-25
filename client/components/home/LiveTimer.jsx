'use client';

import React, { useState, useEffect } from 'react';

const LiveTimer = ({ startingAt, timing }) => {
    const [elapsedTime, setElapsedTime] = useState('');

    useEffect(() => {
        // Prefer the new timing structure from backend over legacy startingAt calculation
        if (timing && timing.matchStarted) {
            console.log('[LiveTimer] Using new timing structure:', timing);
            
            const calculateElapsedTimeFromTiming = () => {
                try {
                    // Use the precise timing info from backend
                    const { currentMinute, currentSecond, period, matchStarted } = timing;
                    
                    // If we have precise minute/second info from backend, use it
                    if (currentMinute !== undefined && currentSecond !== undefined) {
                        // Check for end states
                        if (currentMinute >= 90 && period !== '2nd-half') {
                            setElapsedTime('FT');
                            return;
                        }
                        
                        // Display injury time for 90+ minutes
                        if (currentMinute >= 90) {
                            setElapsedTime('90+');
                            return;
                        }
                        
                        // Format as M:SS for display
                        const formattedTime = `${currentMinute}:${currentSecond.toString().padStart(2, '0')}`;
                        setElapsedTime(formattedTime);
                        return;
                    }
                    
                    // Fallback to calculating from matchStarted timestamp
                    const startTimeMs = matchStarted * 1000; // Convert Unix timestamp to milliseconds
                    const now = Date.now();
                    const diffMs = now - startTimeMs;
                    
                    // If match hasn't started yet or negative diff
                    if (diffMs < 0) {
                        setElapsedTime('0:00');
                        return;
                    }

                    // Calculate total minutes from start
                    const totalMinutes = Math.floor(diffMs / (1000 * 60));
                    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

                    // If match started more than 120 minutes ago, it's likely finished
                    if (totalMinutes > 120) {
                        setElapsedTime('FT');
                        return;
                    }

                    // Display 90+ for injury time
                    if (totalMinutes >= 90) {
                        setElapsedTime('90+');
                        return;
                    }

                    // Format as M:SS
                    const formattedTime = `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
                    setElapsedTime(formattedTime);
                    
                } catch (error) {
                    console.error('[LiveTimer] Error calculating elapsed time from timing:', error);
                    setElapsedTime('--');
                }
            };

            // Calculate immediately
            calculateElapsedTimeFromTiming();

            // Update every second only if we don't have precise backend timing
            const interval = setInterval(calculateElapsedTimeFromTiming, 1000);

            return () => {
                console.log('[LiveTimer] Cleaning up timing-based interval');
                clearInterval(interval);
            };
        }

        // Legacy fallback: calculate from startingAt if no timing structure available
        if (!startingAt) {
            console.log('[LiveTimer] No startingAt or timing provided');
            setElapsedTime('');
            return;
        }

        console.log('[LiveTimer] Using legacy startingAt calculation:', startingAt);

        const calculateElapsedTime = () => {
            try {
                // Handle UTC timestamp properly
                let startTime;
                if (typeof startingAt === 'string') {
                    // If the string doesn't have timezone info, treat it as UTC
                    if (!startingAt.includes('T') && !startingAt.includes('Z') && !startingAt.includes('+')) {
                        // Format: "2025-07-16 09:00:00" -> treat as UTC
                        startTime = new Date(startingAt + ' UTC');
                    } else {
                        // Already has timezone info
                        startTime = new Date(startingAt);
                    }
                } else {
                    startTime = new Date(startingAt);
                }

                const now = new Date();
                const diffMs = now.getTime() - startTime.getTime();

                console.log('[LiveTimer] Start time (UTC):', startTime.toISOString());
                console.log('[LiveTimer] Current time:', now.toISOString());
                console.log('[LiveTimer] Difference (ms):', diffMs);

                // If match hasn't started yet
                if (diffMs < 0) {
                    setElapsedTime('0:00');
                    return;
                }

                // Calculate minutes and seconds
                const totalMinutes = Math.floor(diffMs / (1000 * 60));
                const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

                console.log('[LiveTimer] Calculated minutes:', totalMinutes);

                // If match started more than 120 minutes ago, it's likely finished
                if (totalMinutes > 120) {
                    setElapsedTime('FT');
                    return;
                }

                // Cap at 90+ minutes for football matches (plus reasonable injury time)
                if (totalMinutes >= 90) {
                    setElapsedTime('90+');
                    return;
                }

                // Format as MM:SS
                const formattedTime = `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
                setElapsedTime(formattedTime);
            } catch (error) {
                console.error('[LiveTimer] Error calculating elapsed time:', error);
                setElapsedTime('--');
            }
        };

        // Calculate immediately
        calculateElapsedTime();

        // Update every second
        const interval = setInterval(calculateElapsedTime, 1000);

        return () => {
            console.log('[LiveTimer] Cleaning up legacy interval');
            clearInterval(interval);
        };
    }, [startingAt, timing]);

    if (!elapsedTime) {
        return <span className="text-xs text-gray-600">--</span>;
    }

    return (
        <span className="text-xs text-gray-600 font-medium flex items-center gap-1">
            {timing && timing.matchStarted && (
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Live timing from server"></span>
            )}
            {elapsedTime}
        </span>
    );
};

export default LiveTimer; 
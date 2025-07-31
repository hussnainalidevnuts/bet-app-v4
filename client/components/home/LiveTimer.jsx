'use client';

import React, { useState, useEffect } from 'react';
import { calculateServerTimeOffset, getCorrectedCurrentTime, parseSportsMonksTime } from '@/lib/utils';

const LiveTimer = ({ startingAt, timing }) => {
    const [elapsedTime, setElapsedTime] = useState('');
    const [serverTimeOffset, setServerTimeOffset] = useState(0);

    // Calculate server time offset to handle timezone differences
    useEffect(() => {
        const offset = calculateServerTimeOffset(timing);
        setServerTimeOffset(offset);
    }, [timing]);

    useEffect(() => {
        // Prefer the new timing structure from backend over legacy startingAt calculation
        if (timing && timing.matchStarted) {
            console.log('[LiveTimer] Using new timing structure:', timing);
            
            const calculateElapsedTimeFromTiming = () => {
                try {
                    // Use the precise timing info from backend
                    const { currentMinute, currentSecond, period, matchStarted, cacheTime, isTicking, timeSource } = timing;
                    
                    // If we have precise minute/second info from backend and it's ticking, calculate from that base
                    if (currentMinute !== undefined && currentSecond !== undefined && isTicking && cacheTime) {
                        // Calculate how much time has passed since the cache time
                        const now = Date.now();
                        const cacheAgeMs = now - cacheTime;
                        const cacheAgeSeconds = Math.floor(cacheAgeMs / 1000);
                        
                        // Add the cache age to the cached time
                        let totalSeconds = (currentMinute * 60) + currentSecond + cacheAgeSeconds;
                        let totalMinutes = Math.floor(totalSeconds / 60);
                        let seconds = totalSeconds % 60;
                        
                        // Debug logging (only log once per second to avoid spam)
                        if (Math.random() < 0.1) { // 10% chance to log
                            console.log(`[LiveTimer] Time calc: Backend: ${currentMinute}:${currentSecond.toString().padStart(2, '0')} (${timeSource}), Cache age: ${cacheAgeSeconds}s, Current: ${totalMinutes}:${seconds.toString().padStart(2, '0')}`);
                        }
                        
                        // Check for end states
                        if (totalMinutes >= 90 && period !== '2nd-half') {
                            setElapsedTime('FT');
                            return;
                        }
                        
                        // Show actual time even for 90+ minutes (injury time)
                        // No special handling needed - just show the actual time
                        
                        // Format as M:SS for display
                        const formattedTime = `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
                        setElapsedTime(formattedTime);
                        return;
                    }
                    
                    // If not ticking or no precise timing, calculate from matchStarted timestamp
                    if (matchStarted) {
                        const startTimeMs = matchStarted * 1000; // Convert Unix timestamp to milliseconds
                        const correctedNow = getCorrectedCurrentTime(serverTimeOffset);
                        const diffMs = correctedNow.getTime() - startTimeMs;
                        
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
                        return;
                    }
                    
                    // Fallback
                    setElapsedTime('--');
                    
                } catch (error) {
                    console.error('[LiveTimer] Error calculating elapsed time from timing:', error);
                    setElapsedTime('--');
                }
            };

            // Calculate immediately
            calculateElapsedTimeFromTiming();

            // Always update every second for live matches to ensure smooth ticking
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
                // Use the improved time parsing utility
                const startTime = parseSportsMonksTime(startingAt);
                if (!startTime) {
                    setElapsedTime('--');
                    return;
                }

                const correctedNow = getCorrectedCurrentTime(serverTimeOffset);
                const diffMs = correctedNow.getTime() - startTime.getTime();

                console.log('[LiveTimer] Start time (UTC):', startTime.toISOString());
                console.log('[LiveTimer] Current time (corrected):', correctedNow.toISOString());
                console.log('[LiveTimer] Server offset:', serverTimeOffset, 'ms');
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

                // Show actual time even for 90+ minutes (injury time)
                // No special handling needed - just show the actual time

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
    }, [startingAt, timing, serverTimeOffset]);

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
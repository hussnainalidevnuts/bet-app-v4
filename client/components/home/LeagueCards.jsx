'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBetting } from '@/hooks/useBetting';
import leaguesData, { getLiveLeagues } from '@/data/dummayLeagues';
import { formatToLocalTime, formatMatchTime } from '@/lib/utils';
import LiveTimer from './LiveTimer';
import LeagueCardsSkeleton from '../Skeletons/LeagueCardsSkeleton';
import { useSelector } from 'react-redux';
import { selectIsConnected } from '@/lib/features/websocket/websocketSlice';
import { useLiveOdds } from '@/hooks/useLiveOdds';

// Match Item Component
const MatchItem = ({ match, isInPlay, createBetHandler, buttonsReady, getOddButtonClass, isOddClickable }) => {
    const liveOdds = useLiveOdds(match.id);
    
    return (
        <div>
            <div className='flex justify-between mt-2'>
                <div className="text-xs text-gray-600">
                    {isInPlay && match.isLive ? (
                        <LiveTimer 
                            startingAt={match.starting_at} 
                            timing={match.timing} 
                        />
                    ) : (
                        match.starting_at ? (
                            <div>
                                {formatMatchTime(match.starting_at).date} - {formatMatchTime(match.starting_at).time}
                            </div>
                        ) : (
                            match.time || match.start
                        )
                    )}
                </div>
                <div className="text-xs text-gray-500">
                    {isInPlay && match.isLive ? (
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            LIVE
                        </span>
                    ) : ''}
                </div>
            </div>
            <Link href={`/matches/${match.id}`}>
                <div className="cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-1 rounded">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="text-[12px] mb-1 flex items-center gap-2" title={match.team1 || match.homeName}>
                                <span>
                                    {(match.team1 || match.homeName || '').length > 6 ? `${(match.team1 || match.homeName || '').slice(0, 18)}...` : (match.team1 || match.homeName || '')}
                                </span>
                            </div>
                            <div className="text-[12px] flex items-center gap-2" title={match.team2 || match.awayName}>
                                <span>
                                    {(match.team2 || match.awayName || '').length > 6 ? `${(match.team2 || match.awayName || '').slice(0, 18)}...` : (match.team2 || match.awayName || '')}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center flex-shrink-0">
                            <div className="flex gap-1">
                                {(() => {
                                    // Use live odds if available, otherwise fall back to match odds
                                    let displayOdds;
                                    if (isInPlay && match.isLive && liveOdds && (liveOdds.home || liveOdds.draw || liveOdds.away)) {
                                        displayOdds = liveOdds;
                                    } else if (match.odds) {
                                        displayOdds = match.odds;
                                    } else if (match.mainBetOffer && match.mainBetOffer.outcomes) {
                                        // Convert Unibet API odds format to expected format
                                        displayOdds = {};
                                        match.mainBetOffer.outcomes.forEach(outcome => {
                                            // Convert Unibet API odds format (divide by 1000)
                                            const convertedOdds = outcome.oddsDecimal || (parseFloat(outcome.odds) / 1000).toFixed(2);
                                            
                                            if (outcome.label === '1' || outcome.label === 'Home') {
                                                displayOdds['1'] = convertedOdds;
                                            } else if (outcome.label === 'X' || outcome.label === 'Draw') {
                                                displayOdds['X'] = convertedOdds;
                                            } else if (outcome.label === '2' || outcome.label === 'Away') {
                                                displayOdds['2'] = convertedOdds;
                                            }
                                        });
                                    } else {
                                        displayOdds = {};
                                    }
                                    
                                    const isUsingLiveOdds = isInPlay && match.isLive && liveOdds && (liveOdds.home || liveOdds.draw || liveOdds.away);
                                    
                                    // Helper function to get suspended status for an odd
                                    const getSuspendedStatus = (oddKey) => {
                                        if (isUsingLiveOdds && liveOdds[oddKey]) {
                                            return liveOdds[oddKey].suspended || false;
                                        }
                                        if (displayOdds[oddKey] && typeof displayOdds[oddKey] === 'object') {
                                            return displayOdds[oddKey].suspended || false;
                                        }
                                        return false;
                                    };

                                    // Helper function to get odd value
                                    const getOddValue = (oddKey) => {
                                        if (isUsingLiveOdds && liveOdds[oddKey]) {
                                            return liveOdds[oddKey].value || liveOdds[oddKey];
                                        }
                                        if (displayOdds[oddKey]) {
                                            if (typeof displayOdds[oddKey] === 'object' && displayOdds[oddKey].value !== undefined) {
                                                return displayOdds[oddKey].value;
                                            }
                                            return displayOdds[oddKey];
                                        }
                                        return null;
                                    };
                                    
                                    return (
                                        <>
                                            {/* Handle both formats: live odds (home/draw/away) and transformed odds (1/X/2) */}
                                            {(displayOdds.home || displayOdds['1']) && (
                                                <Button
                                                    size="sm"
                                                    className={getOddButtonClass({ suspended: getSuspendedStatus('home') || getSuspendedStatus('1') })}
                                                    onClick={isOddClickable({ suspended: getSuspendedStatus('home') || getSuspendedStatus('1') })
                                                        ? createBetHandler(match, 'Home', getOddValue('home') || getOddValue('1'), '1x2', (liveOdds.home?.oddId || displayOdds['1']?.oddId || null), { marketId: "1_home", label: "Home", name: `Win - ${match.team1 || match.participants?.[0]?.name || 'Team 1'}`, marketDescription: "Full Time Result" })
                                                        : undefined
                                                    }
                                                    disabled={!isOddClickable({ suspended: getSuspendedStatus('home') || getSuspendedStatus('1') })}
                                                >
                                                    {(getSuspendedStatus('home') || getSuspendedStatus('1')) ? '--' : (getOddValue('home') || getOddValue('1'))}
                                                </Button>
                                            )}
                                            {(displayOdds.draw || displayOdds['X']) && (
                                                <Button
                                                    size="sm"
                                                    className={getOddButtonClass({ suspended: getSuspendedStatus('draw') || getSuspendedStatus('X') })}
                                                    onClick={isOddClickable({ suspended: getSuspendedStatus('draw') || getSuspendedStatus('X') })
                                                        ? createBetHandler(match, 'Draw', getOddValue('draw') || getOddValue('X'), '1x2', (liveOdds.draw?.oddId || displayOdds['X']?.oddId || null), { marketId: "1_draw", label: "Draw", name: `Draw - ${match.team1 || match.participants?.[0]?.name || 'Team 1'} vs ${match.team2 || match.participants?.[1]?.name || 'Team 2'}`, marketDescription: "Full Time Result" })
                                                        : undefined
                                                    }
                                                    disabled={!isOddClickable({ suspended: getSuspendedStatus('draw') || getSuspendedStatus('X') })}
                                                >
                                                    {(getSuspendedStatus('draw') || getSuspendedStatus('X')) ? '--' : (getOddValue('draw') || getOddValue('X'))}
                                                </Button>
                                            )}
                                            {(displayOdds.away || displayOdds['2']) && (
                                                <Button
                                                    size="sm"
                                                    className={getOddButtonClass({ suspended: getSuspendedStatus('away') || getSuspendedStatus('2') })}
                                                    onClick={isOddClickable({ suspended: getSuspendedStatus('away') || getSuspendedStatus('2') })
                                                        ? createBetHandler(match, 'Away', getOddValue('away') || getOddValue('2'), '1x2', (liveOdds.away?.oddId || displayOdds['2']?.oddId || null), { marketId: "1_away", label: "Away", name: `Win - ${match.team2 || match.participants?.[1]?.name || 'Team 2'}`, marketDescription: "Full Time Result" })
                                                        : undefined
                                                    }
                                                    disabled={!isOddClickable({ suspended: getSuspendedStatus('away') || getSuspendedStatus('2') })}
                                                >
                                                    {(getSuspendedStatus('away') || getSuspendedStatus('2')) ? '--' : (getOddValue('away') || getOddValue('2'))}
                                                </Button>
                                            )}
                                            {isUsingLiveOdds && (
                                                <div className="text-xs text-green-500 ml-1">
                                                    🔄
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
};

// League Card Component
const LeagueCard = ({ league, isInPlay = false, viewAllText = null }) => {
    const { createBetHandler } = useBetting();
    const [buttonsReady, setButtonsReady] = useState(false);
    const isConnected = useSelector(selectIsConnected);

    // For live matches, delay button activation to prevent premature clicking
    useEffect(() => {
        if (isInPlay) {
            const timer = setTimeout(() => {
                setButtonsReady(true);
            }, 500); // 500ms delay for live matches
            return () => clearTimeout(timer);
        } else {
            setButtonsReady(true); // Non-live matches are immediately ready
        }
    }, [isInPlay]);

    // Helper function to extract main odds (1X2) from live odds data
    const extractMainOddsFromLiveData = (liveOddsData) => {
        if (!liveOddsData || !Array.isArray(liveOddsData)) {
            return {};
        }

        const mainOdds = {};
        
        // Find the main result market (1X2)
        const resultMarket = liveOddsData.find(odd => 
            odd.market_name === 'Full Time Result' || 
            odd.market_name === 'Match Result' ||
            odd.market_name === '1X2'
        );
        
        if (resultMarket && resultMarket.odds) {
            resultMarket.odds.forEach(odd => {
                if (odd.label === 'Home' || odd.label === '1') {
                    mainOdds['1'] = {
                        value: odd.odds,
                        oddId: odd.id,
                        suspended: odd.suspended || false
                    };
                } else if (odd.label === 'Draw' || odd.label === 'X') {
                    mainOdds['X'] = {
                        value: odd.odds,
                        oddId: odd.id,
                        suspended: odd.suspended || false
                    };
                } else if (odd.label === 'Away' || odd.label === '2') {
                    mainOdds['2'] = {
                        value: odd.odds,
                        oddId: odd.id,
                        suspended: odd.suspended || false
                    };
                }
            });
        }
        
        return mainOdds;
    };

    const isOddClickable = (odd) => {
        if (!buttonsReady) return false;
        if (isInPlay && odd.suspended) return false;
        return true;
    };

    const getOddButtonClass = (odd) => {
        const baseClass = "w-14 h-8 p-0 text-xs font-bold betting-button";
        if (!buttonsReady || (isInPlay && odd.suspended)) {
            return `${baseClass} opacity-60 cursor-not-allowed bg-gray-400 hover:bg-gray-400`;
        }
        return `${baseClass} bg-emerald-600 hover:bg-emerald-700`;
    };

    return (
        <div className="bg-white border border-gray-200 rounded-none shadow-none mb-4 h-[495px] flex flex-col">
            {/* League Header */}
            <div className="border-b border-gray-200 p-4 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {league.imageUrl ? (
                            <img src={league.imageUrl} alt={league.name} className="w-6 h-6 object-contain" />
                        ) : (
                            <span className="text-lg">{league.icon}</span>
                        )}
                        <div>
                            <h3 className="font-medium text-sm text-gray-800">{league.name}</h3>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500">
                        {isInPlay ? league.day : league.day}
                    </div>
                </div>
            </div>
            {/* Odds Header */}
            <div className="flex items-center px-4 py-2 bg-gray-100 border-b border-gray-200 flex-shrink-0">
                <div className="flex-1 text-xs">{isInPlay ? 'Today' : 'Match'}</div>
                <div className="flex gap-1">
                    <div className="w-14 text-center text-xs text-gray-600 font-medium">1</div>
                    <div className="w-14 text-center text-xs text-gray-600 font-medium">X</div>
                    <div className="w-14 text-center text-xs text-gray-600 font-medium">2</div>
                </div>
            </div>
            {/* Matches */}
            <div className="p-4 py-0 flex-1 overflow-y-auto">
                {league.matches.slice(0, 4).map((match, index) => (
                    <div key={match.id}>
                        <MatchItem 
                            match={match}
                            isInPlay={isInPlay}
                            createBetHandler={createBetHandler}
                            buttonsReady={buttonsReady}
                            getOddButtonClass={getOddButtonClass}
                            isOddClickable={isOddClickable}
                        />
                        {index < Math.min(league.matches.length, 4) - 1 && (
                            <div className="border-b border-gray-300 mx-0 my-2"></div>
                        )}
                    </div>
                ))}
            </div>
            {/* More Button */}
            <div className="p-4 py-3 flex items-center justify-center font-medium border-t border-gray-200 flex-shrink-0">
                <Link href={isInPlay ? `/inplay` : `/leagues/${league.id}`}
                    variant="outline"
                    size="sm"
                    className="w-full text-base text-xs text-center "
                >
                    {viewAllText || (isInPlay ? 'View All Live Matches' : `More ${league.name}`)}
                </Link>
            </div>
        </div>
    );
};

const LeagueCards = ({
    title = "Football Daily",
    isInPlay = false,
    showDayTabs = false,
    viewAllText = null,
    useReduxData = false,
    reduxData = [],
    loading = false
}) => {
    const scrollRef = useRef(null);

   

    // Transform Redux data to match the expected format
    const transformReduxData = (data) => {
        
        if (data && Array.isArray(data)) {
            
            // Check if data is already in league format or individual matches
            const isLeagueFormat = data.length > 0 && data[0].matches && Array.isArray(data[0].matches);
            
            if (isLeagueFormat) {
                // League format: data is already grouped by leagues
                return data?.map(leagueData => {
                    if (!leagueData.matches || !Array.isArray(leagueData.matches)) {
                        return null;
                    }
                    
                    // Transform matches to match the expected format
                    const transformedMatches = leagueData.matches.map(match => {
    
    
                    // Handle both formats: Unibet API (homeName/awayName) and old format (name with ' vs ')
                    let teamNames;
                    if (match.homeName && match.awayName) {
                        // Unibet API format
                        teamNames = [match.homeName, match.awayName];
                    } else if (match.name) {
                        // Old format
                        teamNames = match.name.split(' vs ') || ['Team A', 'Team B'];
                    } else {
                        teamNames = ['Team A', 'Team B'];
                    }
    
                    // Extract odds - handle the new object format from backend
                    const odds = {};
    

    
                    // Check for odds in different possible locations
                    // Unibet API uses mainBetOffer, old format uses odds_main/odds
                    let oddsData = {};
                    if (match.mainBetOffer && match.mainBetOffer.outcomes) {
                        // Unibet API format - extract from mainBetOffer.outcomes
                        const outcomes = match.mainBetOffer.outcomes;
                        const homeOdds = outcomes.find(o => o.label === '1')?.odds;
                        const drawOdds = outcomes.find(o => o.label === 'X')?.odds;
                        const awayOdds = outcomes.find(o => o.label === '2')?.odds;
                        
                        oddsData = {
                            home: homeOdds ? homeOdds / 1000 : null, // Divide by 1000 to get decimal odds
                            draw: drawOdds ? drawOdds / 1000 : null,
                            away: awayOdds ? awayOdds / 1000 : null
                        };
                    } else {
                        // Old format
                        oddsData = match.odds_main || match.odds || {};
                    }
                    

                    
                    if (oddsData && Object.keys(oddsData).length > 0) {
                        if (typeof oddsData === 'object' && !Array.isArray(oddsData)) {
                            // Handle different odds formats
                            if (oddsData.home) {
                                // Handle both formats: { home: value } and { home: { value, oddId } }
                                if (typeof oddsData.home === 'object' && oddsData.home.value !== undefined) {
                                    // Object format: { home: { value, oddId } }
                                    odds['1'] = { 
                                        value: Number(oddsData.home.value).toFixed(2), 
                                        oddId: oddsData.home.oddId || null,
                                        suspended: oddsData.home.suspended || false
                                    };
                                } else if (typeof oddsData.home === 'number') {
                                    // Simple format: { home: value }
                                    odds['1'] = { 
                                        value: Number(oddsData.home).toFixed(2), 
                                        oddId: null,
                                        suspended: false
                                    };
                                }
                            }
                            if (oddsData.draw) {
                                // Handle both formats: { draw: value } and { draw: { value, oddId } }
                                if (typeof oddsData.draw === 'object' && oddsData.draw.value !== undefined) {
                                    // Object format: { draw: { value, oddId } }
                                    odds['X'] = { 
                                        value: Number(oddsData.draw.value).toFixed(2), 
                                        oddId: oddsData.draw.oddId || null,
                                        suspended: oddsData.draw.suspended || false
                                    };
                                } else if (typeof oddsData.draw === 'number') {
                                    // Simple format: { draw: value }
                                    odds['X'] = { 
                                        value: Number(oddsData.draw).toFixed(2), 
                                        oddId: null,
                                        suspended: false
                                    };
                                }
                            }
                            if (oddsData.away) {
                                // Handle both formats: { away: value } and { away: { value, oddId } }
                                if (typeof oddsData.away === 'object' && oddsData.away.value !== undefined) {
                                    // Object format: { away: { value, oddId } }
                                    odds['2'] = { 
                                        value: Number(oddsData.away.value).toFixed(2), 
                                        oddId: oddsData.away.oddId || null,
                                        suspended: oddsData.away.suspended || false
                                    };
                                } else if (typeof oddsData.away === 'number') {
                                    // Simple format: { away: value }
                                    odds['2'] = { 
                                        value: Number(oddsData.away).toFixed(2), 
                                        oddId: null,
                                        suspended: false
                                    };
                                }
                            }
                        } else if (Array.isArray(oddsData)) {
                            // Legacy array format (if still present)
                            oddsData.forEach(odd => {
                                const value = parseFloat(odd.value);
                                if (!isNaN(value)) {
                                    if (odd.label === '1' || odd.label === 'Home' || odd.name === 'Home') {
                                        odds['1'] = { 
                                            value: value.toFixed(2), 
                                            oddId: odd.oddId,
                                            suspended: odd.suspended || false
                                        };
                                    }
                                    if (odd.label === 'X' || odd.label === 'Draw' || odd.name === 'Draw') {
                                        odds['X'] = { 
                                            value: value.toFixed(2), 
                                            oddId: odd.oddId,
                                            suspended: odd.suspended || false
                                        };
                                    }
                                    if (odd.label === '2' || odd.label === 'Away' || odd.name === 'Away') {
                                        odds['2'] = { 
                                            value: value.toFixed(2), 
                                            oddId: odd.oddId,
                                            suspended: odd.suspended || false
                                        };
                                    }
                                }
                            });
                        }
                    }
    
                    // For in-play matches, show them even without odds
                    // For other matches, skip if no odds are available
                    if (!isInPlay && Object.keys(odds).length === 0) {
                        return null; // Don't include this match
                    }                    // Format the actual match time and determine if it's live
                    let displayTime = 'TBD'; // Default
                    let isMatchLive = false;
                    
                    if (match.starting_at) {
                        if (isInPlay) {
                            // For in-play section, check if match is actually live
                            // Common live state IDs: 2 (live), 3 (halftime), 4 (extra time), 22 (2nd half), 23 (2nd half HT), 24 (extra time)
                            // Based on SportMonks API documentation
                            const liveStateIds = [2, 3, 4, 22, 23, 24]; // Live match states
                            const now = new Date();
                            const startTime = new Date((match.starting_at || match.start) + ((match.starting_at || match.start).includes('Z') ? '' : ' UTC'));
                            const timeSinceStart = now.getTime() - startTime.getTime();
                            const minutesSinceStart = Math.floor(timeSinceStart / (1000 * 60));
                            
                            // Consider match live if:
                            
                            // 1. Match has a live state_id (2=live, 3=halftime, 4=extra time)
                            const hasLiveState = match.state_id && liveStateIds.includes(match.state_id);
                            
                            // 2. Match started within last 120 minutes (reasonable match duration)
                            const isWithinTimeWindow = (timeSinceStart > 0 && minutesSinceStart <= 120);
                            
                            isMatchLive = hasLiveState || isWithinTimeWindow;
                        }
                        
                        if (!isInPlay || !isMatchLive) {
                            displayTime = formatToLocalTime(match.starting_at || match.start, { format: 'timeOnly' });
                        }
                    }

                    return {
                        id: match.id,
                        team1: teamNames[0],
                        team2: teamNames[1],
                        time: displayTime,
                        odds: odds,
                        clock: true,
                        starting_at: match.starting_at || match.start, // Handle both formats
                        state_id: match.state_id || (match.state === 'STARTED' ? 2 : 1), // Map Unibet state to state_id
                        isLive: isMatchLive, // Add live flag
                        timing: match.timing || null // Include timing info from backend if available
                    };
                }).filter(match => match !== null); // Filter out null matches
    
                return {
                    id: leagueData.league.id || leagueData.league, // Handle both object and string formats
                    name: leagueData.league.name || leagueData.league, // Handle both object and string formats
                    icon: "⚽", // Default icon
                    imageUrl: leagueData.league.imageUrl || null,
                    day: "Today",
                    matches: transformedMatches
                };
            }).filter(league => league !== null);
            
            } else {
                // New format: data is individual matches, need to group by league
                const leagueMap = new Map();
                
                data.forEach(match => {
                    if (!match.id || !match.team1 || !match.team2) {
                        return; // Skip invalid matches
                    }
                    
                    const leagueId = match.league?.id || match.league_id || 'unknown';
                    const leagueName = match.league?.name || `League ${leagueId}`;
                    
                    if (!leagueMap.has(leagueId)) {
                        leagueMap.set(leagueId, {
                            id: leagueId,
                            name: leagueName,
                            icon: "⚽",
                            imageUrl: match.league?.imageUrl || null,
                            day: "Today",
                            matches: []
                        });
                    }
                    
                    // Transform the match
                    const teamNames = match.name?.split(' vs ') || [match.team1, match.team2];
                    const oddsData = match.odds || {};
                    const odds = {};
                    
                    // Extract odds
                    if (oddsData.home) {
                        if (typeof oddsData.home === 'object' && oddsData.home.value !== undefined) {
                            odds['1'] = { 
                                value: Number(oddsData.home.value).toFixed(2), 
                                oddId: oddsData.home.oddId || null,
                                suspended: oddsData.home.suspended || false
                            };
                        } else if (typeof oddsData.home === 'number') {
                            odds['1'] = { 
                                value: Number(oddsData.home).toFixed(2), 
                                oddId: null,
                                suspended: false
                            };
                        }
                    }
                    if (oddsData.draw) {
                        if (typeof oddsData.draw === 'object' && oddsData.draw.value !== undefined) {
                            odds['X'] = { 
                                value: Number(oddsData.draw.value).toFixed(2), 
                                oddId: oddsData.draw.oddId || null,
                                suspended: oddsData.draw.suspended || false
                            };
                        } else if (typeof oddsData.draw === 'number') {
                            odds['X'] = { 
                                value: Number(oddsData.draw).toFixed(2), 
                                oddId: null,
                                suspended: false
                            };
                        }
                    }
                    if (oddsData.away) {
                        if (typeof oddsData.away === 'object' && oddsData.away.value !== undefined) {
                            odds['2'] = { 
                                value: Number(oddsData.away.value).toFixed(2), 
                                oddId: oddsData.away.oddId || null,
                                suspended: oddsData.away.suspended || false
                            };
                        } else if (typeof oddsData.away === 'number') {
                            odds['2'] = { 
                                value: Number(oddsData.away).toFixed(2), 
                                oddId: null,
                                suspended: false
                            };
                        }
                    }
                    
                    // For in-play matches, show them even without odds
                    // For other matches, skip if no odds are available
                    if (!isInPlay && Object.keys(odds).length === 0) {
                        return;
                    }
                    
                    // Format time
                    let displayTime = 'TBD';
                    let isMatchLive = false;
                    
                    if (match.starting_at) {
                        if (isInPlay) {
                            const liveStateIds = [2, 3, 4, 22, 23, 24];
                            const now = new Date();
                            const startTime = new Date((match.starting_at || match.start) + ((match.starting_at || match.start).includes('Z') ? '' : ' UTC'));
                            const timeSinceStart = now.getTime() - startTime.getTime();
                            const minutesSinceStart = Math.floor(timeSinceStart / (1000 * 60));
                            
                            const hasLiveState = match.state_id && liveStateIds.includes(match.state_id);
                            const isWithinTimeWindow = (timeSinceStart > 0 && minutesSinceStart <= 120);
                            
                            isMatchLive = hasLiveState || isWithinTimeWindow;
                        }
                        
                        if (!isInPlay || !isMatchLive) {
                            displayTime = formatToLocalTime(match.starting_at || match.start, { format: 'timeOnly' });
                        }
                    }
                    
                    const transformedMatch = {
                        id: match.id,
                        team1: teamNames[0],
                        team2: teamNames[1],
                        time: displayTime,
                        odds: odds,
                        clock: true,
                        starting_at: match.starting_at,
                        state_id: match.state_id,
                        isLive: isMatchLive,
                        timing: match.timing || null
                    };
                    
                    leagueMap.get(leagueId).matches.push(transformedMatch);
                });
                
                return Array.from(leagueMap.values()).filter(league => league.matches.length > 0);
            }
        }
        return null;
     
    };

    // Show skeleton while loading
    if (loading) {
        return <LeagueCardsSkeleton title={title} />;
    }

    const transformed = transformReduxData(reduxData).filter(league=>league.matches.length > 0);
   

    if (!transformed || transformed.length === 0) {
        return (
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    {viewAllText && (
                        <Link href="/matches" className="text-green-600 hover:underline text-sm">
                            {viewAllText}
                        </Link>
                    )}
                </div>
                <div className="text-gray-500 text-center py-8">
                    No {title.toLowerCase()} matches available at the moment.
                </div>
            </div>
        );
    }

    // Get appropriate data based on mode
    let displayData;
    if (useReduxData && reduxData) {
        displayData = transformed;
    } else {
        displayData = isInPlay ? getLiveLeagues() : leaguesData;
    }

    // If in-play mode and no live matches, don't render the component
    if (isInPlay && displayData.length === 0) {
        return null;
    }

    const scrollLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
        }
    };

    return (
        <div className="mb-8">
            {title && (
                <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
            )}

            {/* Day Tabs */}
            {/* {showDayTabs && (
                <div className="flex gap-2 mb-6">
                    <Button
                        size="sm"
                        variant="default"
                        className="bg-gray-200 text-gray-800 text-xs hover:bg-gray-300 rounded-full px-4"
                    >
                        Today
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-300 text-gray-600 text-xs hover:bg-gray-50 rounded-full px-4"
                    >
                        Tomorrow
                    </Button>
                </div>
            )} */}
            {/* Carousel Navigation */}
            <div className="relative group">
                <Button
                    variant="outline"
                    size="sm"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white shadow-lg border-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={scrollLeft}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white shadow-lg border-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={scrollRight}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>

                {/* League Cards in horizontal scroll */}
                <div
                    ref={scrollRef}
                    className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide"
                >
                    {transformed.map((league, index) => (
                        <div key={league.id || league.name || `league-${index}`} className="flex-shrink-0 w-96">
                            <LeagueCard
                                league={league}
                                isInPlay={isInPlay}
                                viewAllText={viewAllText}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LeagueCards;

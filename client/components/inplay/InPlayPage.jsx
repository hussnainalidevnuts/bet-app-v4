'use client';

import React, { useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchLiveMatches, selectLiveMatchesGrouped, selectLiveMatchesLoading, selectLiveMatchesError } from '@/lib/features/matches/liveMatchesSlice';
import MatchListPage from '@/components/shared/MatchListPage';
import LiveTimer from '@/components/home/LiveTimer';

const InPlayPage = () => {
    const liveMatchesRaw = useSelector(selectLiveMatchesGrouped);
    const loading = useSelector(selectLiveMatchesLoading);
    const error = useSelector(selectLiveMatchesError);
    const dispatch = useDispatch();
    
    useEffect(() => {
        dispatch(fetchLiveMatches());
    }, [dispatch]);

    // Transform Unibet API data to match MatchListPage expected format
    const displayMatches = useMemo(() => {
        if (!Array.isArray(liveMatchesRaw)) {
            return [];
        }
        
        return liveMatchesRaw.map(leagueData => ({
            id: leagueData.league || Math.random().toString(36).substr(2, 9),
            name: leagueData.league || 'Unknown League',
            league: {
                id: leagueData.league,
                name: leagueData.league,
                imageUrl: null, // Unibet API doesn't provide league images
            },
            icon: "⚽",
            matches: (leagueData.matches || []).map(match => {
                // Extract team names from Unibet API format
                const team1 = match.homeName || match.team1 || 'Home Team';
                const team2 = match.awayName || match.team2 || 'Away Team';
                
                // Extract odds from Unibet API format
                let odds = {};
                if (match.mainBetOffer && match.mainBetOffer.outcomes) {
                    match.mainBetOffer.outcomes.forEach(outcome => {
                        // Convert Unibet API odds format (divide by 1000)
                        const convertedOdds = outcome.oddsDecimal || (parseFloat(outcome.odds) / 1000).toFixed(2);
                        
                        if (outcome.label === '1' || outcome.label === 'Home') {
                            odds.home = {
                                value: convertedOdds,
                                oddId: outcome.id || outcome.outcomeId,
                                suspended: false
                            };
                        } else if (outcome.label === 'X' || outcome.label === 'Draw') {
                            odds.draw = {
                                value: convertedOdds,
                                oddId: outcome.id || outcome.outcomeId,
                                suspended: false
                            };
                        } else if (outcome.label === '2' || outcome.label === 'Away') {
                            odds.away = {
                                value: convertedOdds,
                                oddId: outcome.id || outcome.outcomeId,
                                suspended: false
                            };
                        }
                    });
                }
                
                // Format start time - ensure it's in the expected format
                let startTime = match.start || match.starting_at;
                
                // If startTime is an ISO string, convert it to the expected format
                if (startTime && typeof startTime === 'string') {
                    try {
                        const date = new Date(startTime);
                        if (!isNaN(date.getTime())) {
                            // Format as "YYYY-MM-DD HH:MM:SS" for MatchListPage compatibility
                            startTime = date.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
                        }
                    } catch (e) {
                        console.warn('Invalid start time format:', startTime);
                        startTime = null;
                    }
                }
                
                return {
                    id: match.id || match.eventId,
                    team1: team1,
                    team2: team2,
                    starting_at: startTime,
                    odds: odds,
                    isLive: true, // Live matches are live
                    league: {
                        name: leagueData.league
                    }
                };
            }),
            matchCount: leagueData.matches?.length || 0,
        }));
    }, [liveMatchesRaw]);

    const inPlayConfig = {
        pageTitle: 'Live Matches',
        breadcrumbText: 'Football | In-Play Matches',
        leagues: displayMatches,
        loading,
        error,
        retryFunction: () => dispatch(fetchLiveMatches()),
        matchTimeComponent: LiveTimer, // Use LiveTimer component for real-time updates
        PageIcon: Clock,
        noMatchesConfig: {
            title: 'No Live Matches',
            message: 'There are no live matches available at the moment. Check back later for live games.',
            buttonText: 'View All Matches',
            buttonLink: '/',
            Icon: Clock
        }
    };

    return <MatchListPage config={inPlayConfig} />;
};

export default InPlayPage;

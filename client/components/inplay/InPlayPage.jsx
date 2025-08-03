'use client';

import React, { useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchLiveMatches, selectLiveMatches, selectLiveMatchesLoading, selectLiveMatchesError } from '@/lib/features/matches/liveMatchesSlice';
import { selectLiveMatches as selectWebSocketLiveMatches } from '@/lib/features/websocket/websocketSlice';
import MatchListPage from '@/components/shared/MatchListPage'; // Updated import path
import LiveTimer from '@/components/home/LiveTimer';

const InPlayPage = () => {
    const dispatch = useDispatch();
    const liveMatches = useSelector(selectLiveMatches);
    const webSocketLiveMatches = useSelector(selectWebSocketLiveMatches);
    const loading = useSelector(selectLiveMatchesLoading);
    const error = useSelector(selectLiveMatchesError);

    useEffect(() => {
        // Initial fetch (with loading state)
        dispatch(fetchLiveMatches());
    }, [dispatch]);

    // Use WebSocket live matches if available, otherwise use HTTP live matches
    const displayMatches = webSocketLiveMatches.length > 0 ? webSocketLiveMatches : liveMatches;

    const inPlayConfig = {
        pageTitle: 'Live Matches',
        breadcrumbText: 'Football | In-Play Matches',
        leagues: displayMatches,
        loading,
        error,
        matchTimeComponent: LiveTimer, // Use LiveTimer component for real-time updates
        PageIcon: Clock,
        noMatchesConfig: {
            title: 'No Live Matches',
            message: 'There are no live matches available at the moment.',
            buttonText: 'View All Matches',
            buttonLink: '/',
            Icon: Clock
        }
    };

    return <MatchListPage config={inPlayConfig} />;
};

export default InPlayPage;

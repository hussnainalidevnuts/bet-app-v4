'use client';

import React, { useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchLiveMatches, selectLiveMatches, selectLiveMatchesLoading, selectLiveMatchesError } from '@/lib/features/matches/liveMatchesSlice';
import MatchListPage from '@/components/shared/MatchListPage'; // Updated import path

const InPlayPage = () => {
    const dispatch = useDispatch();
    const liveMatches = useSelector(selectLiveMatches);
    const loading = useSelector(selectLiveMatchesLoading);
    const error = useSelector(selectLiveMatchesError);

    useEffect(() => {
        dispatch(fetchLiveMatches());
        const interval = setInterval(() => {
            dispatch(fetchLiveMatches());
        }, 180000); // 3 minutes
        return () => clearInterval(interval);
    }, [dispatch]);

    const formatLiveTime = (liveTime) => {
        // Simplified: if liveTime is provided, use it, otherwise default to '45:00'
        // The MatchListPage will handle the case where liveTime might be from match.liveTime
        return liveTime || '45:00';
    };

    const inPlayConfig = {
        pageTitle: 'Live Matches',
        breadcrumbText: 'Football | In-Play Matches',
        leagues: liveMatches,
        loading,
        error,
        matchTimeFormatter: formatLiveTime, // This will be called with match.liveTime by MatchListPage
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

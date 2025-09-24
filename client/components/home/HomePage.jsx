'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TopPicks from './TopPicks';
import LiveMatches from './LiveMatches';
import LeagueCards from './LeagueCards';
import { fetchHomepageData, selectHomeLoading, selectHomeError, selectFootballDaily } from '@/lib/features/home/homeSlice';
import { fetchLiveMatches, selectLiveMatches, selectUpcomingMatchesGrouped } from '@/lib/features/matches/liveMatchesSlice';

const HomePage = () => {
    const dispatch = useDispatch();
    const loading = useSelector(selectHomeLoading);
    const error = useSelector(selectHomeError);
    const footballDaily = useSelector(selectFootballDaily);
    const filteredFootballDaily = footballDaily.filter(league => 
        league.matches.length > 0 && 
        league.matches.some(match => (match.odds_main && Object.keys(match.odds_main).length > 0) || (match.odds && (match.odds.home || match.odds.draw || match.odds.away)))
    );
    
    // Live matches state from Unibet API
    const liveMatches = useSelector(selectLiveMatches);
    // Upcoming matches state from Unibet API (filtered by CSV leagues)
    const upcomingMatches = useSelector(selectUpcomingMatchesGrouped);

    useEffect(() => {
        // Fetch homepage data when component mounts
        dispatch(fetchHomepageData());
        // Fetch live matches from Unibet API
        dispatch(fetchLiveMatches());
    }, [dispatch]);



    // Remove the old loading state since individual components handle their own loading
    // if (loading) {
    //     return (
    //         <div className="flex-1 bg-gray-100">
    //             <div className="p-3 lg:p-6 overflow-hidden">
    //                 <div className="flex items-center justify-center h-64">
    //                     <div className="text-gray-500">Loading homepage data...</div>
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // }

    if (error) {
        return (
            <div className="flex-1 bg-gray-100">
                <div className="p-3 lg:p-6 overflow-hidden">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-red-500">Error: {error}</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-gray-100">
            <div className="p-3 lg:p-6 overflow-hidden">
                <div className="flex flex-col xl:flex-row gap-4 lg:gap-6">
                    {/* Main content area */}
                    <div className="flex-1 min-w-0">
                        {/* Live Matches - using Unibet API */}
                        <LiveMatches />

                        {/* Top Picks - using Redux data */}
                        <TopPicks />

                        {/* Football Daily - using Unibet upcoming matches (filtered by CSV leagues) with fallback */}
                        <LeagueCards
                            title="Football Daily"
                            useReduxData={true}
                            reduxData={upcomingMatches && upcomingMatches.length > 0 ? upcomingMatches : filteredFootballDaily}
                            isInPlay={false}
                            showDayTabs={true}
                            viewAllText="View All Football Daily"
                            loading={loading}
                        />

                        {/* In-Play Section - using live matches from WebSocket */}
                        <LeagueCards
                            title="In-Play"
                            isInPlay={true}
                            showDayTabs={false}
                            viewAllText="View All Live Football"
                            useReduxData={true}
                            reduxData={liveMatches}
                            loading={false}
                        />
                    </div>

                    {/* Right sidebar */}
                    {/* <div className="w-full xl:w-80 xl:flex-shrink-0">
                        <TrendingCombo />
                    </div> */}
                </div>
            </div>
        </div>
    );
};

export default HomePage;

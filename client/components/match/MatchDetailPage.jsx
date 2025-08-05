"use client"
import React, { useEffect } from 'react';
import MatchHeader from "./MatchHeader"
import BettingTabs from "./BettingTabs"
import MatchVisualization from "./MatchVisualization"
import { useCustomSidebar } from "@/contexts/SidebarContext.js"
import { useSelector, useDispatch } from "react-redux"
import { 
    fetchMatchById, 
    clearError
} from "@/lib/features/matches/matchesSlice"
import { selectMatchOdds, selectMatchOddsClassification } from "@/lib/features/websocket/websocketSlice"
import { selectLiveMatches } from '@/lib/features/websocket/websocketSlice';
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"

const isMatchLive = (match) => {
    if (!match || !match.starting_at) return false;
    const now = new Date();
    let matchTime;
    if (match.starting_at.includes('T')) {
        matchTime = new Date(match.starting_at.endsWith('Z') ? match.starting_at : match.starting_at + 'Z');
    } else {
        matchTime = new Date(match.starting_at.replace(' ', 'T') + 'Z');
    }
    const matchEnd = new Date(matchTime.getTime() + 120 * 60 * 1000);
    return matchTime <= now && now < matchEnd;
};

const MatchDetailPage = ({ matchId }) => {
    const dispatch = useDispatch();
    const {
        matchData,
        loading,
        error
    } = useSelector((state) => ({
        matchData: state.matches.matchDetails[matchId],
        loading: state.matches.matchDetailLoading,
        error: state.matches.matchDetailError,
    }));

    const liveOdds = useSelector((state) => selectMatchOdds(state, matchId));
    const liveOddsClassification = useSelector((state) => selectMatchOddsClassification(state, matchId));
    
    // Get live match data from WebSocket to ensure consistent timing
    const liveMatches = useSelector(selectLiveMatches);
    
    // Find the live match data for this specific match
    const liveMatchData = React.useMemo(() => {
        if (!liveMatches || !Array.isArray(liveMatches)) return null;
        
        for (const leagueGroup of liveMatches) {
            if (leagueGroup.matches && Array.isArray(leagueGroup.matches)) {
                const match = leagueGroup.matches.find(m => m.id === parseInt(matchId));
                if (match) {
                    return match;
                }
            }
        }
        return null;
    }, [liveMatches, matchId]);
    
    // Use live match data if available and match is live, otherwise use fetched match data
    const displayMatchData = React.useMemo(() => {
        if (liveMatchData && isMatchLive(liveMatchData)) {
            // Merge live match data with fetched match data to preserve betting data
            return {
                ...matchData,
                ...liveMatchData,
                // Preserve betting data from fetched match data
                betting_data: matchData?.betting_data || liveMatchData?.betting_data,
                odds_classification: matchData?.odds_classification || liveMatchData?.odds_classification
            };
        }
        return matchData;
    }, [matchData, liveMatchData]);

    useEffect(() => {
        if (matchId && !matchData) {
            dispatch(fetchMatchById(matchId));
        }
    }, [matchId, matchData, dispatch]);

    // Join match room for WebSocket updates when match is live
    useEffect(() => {
        if (!matchId || !displayMatchData || !isMatchLive(displayMatchData)) return;

        // Import websocketService dynamically to avoid SSR issues
        import('@/lib/services/websocketService').then(({ default: websocketService }) => {
            websocketService.joinMatch(matchId);
        });

        return () => {
            // Leave match room when component unmounts
            import('@/lib/services/websocketService').then(({ default: websocketService }) => {
                websocketService.leaveMatch(matchId);
            });
        };
    }, [matchId, displayMatchData]);

    const handleRetry = () => {
        dispatch(clearError());
        dispatch(fetchMatchById(matchId));
    };

    const handleRefreshOdds = () => {
        // WebSocket updates are automatic, no need to manually refresh
    };

    if (loading) {
        return (
            <div className="bg-slate-100 min-h-screen relative">
                <div className="lg:mr-80 xl:mr-96">
                    <div className="lg:p-2 xl:p-4">
                        <Card className="w-full">
                            <CardContent className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-base" />
                                    <p className="text-gray-600">Loading match details...</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-slate-100 min-h-screen relative">
                <div className="lg:mr-80 xl:mr-96">
                    <div className="lg:p-2 xl:p-4">
                        <Card className="w-full border-red-200">
                            <CardContent className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
                                    <p className="text-red-600 font-medium mb-2">Failed to load match</p>
                                    <p className="text-gray-600 mb-4">{error}</p>
                                    <Button onClick={handleRetry} variant="outline" size="sm">
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Try Again
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    if (!displayMatchData) {
        return (
            <div className="bg-slate-100 min-h-screen relative">
                <div className="lg:mr-80 xl:mr-96">
                    <div className="lg:p-2 xl:p-4">
                        <Card className="w-full">
                            <CardContent className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <AlertCircle className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                                    <p className="text-gray-600">Match not found</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    const isLive = isMatchLive(displayMatchData);
    const hasLiveOdds = liveOdds && liveOdds.length > 0;
    
    // Determine which odds to show:
    // For live matches: ONLY show live odds
    // For non-live matches: Show pre-match odds
    const bettingData = isLive 
        ? liveOdds || [] // For live matches, only show live odds or empty array if none available
        : displayMatchData.betting_data || []; // Try betting_data first

    // Get the odds classification data
    // For live matches, use live odds classification
    // For non-live matches, use pre-match classification
    const oddsClassification = isLive 
        ? liveOddsClassification || {
            categories: [{ id: 'all', label: 'All', odds_count: 0 }],
            classified_odds: {},
            stats: { total_categories: 0, total_odds: 0 }
          }
        : displayMatchData.odds_classification || {
            categories: [{ id: 'all', label: 'All', odds_count: 0 }],
            classified_odds: {},
            stats: { total_categories: 0, total_odds: 0 }
          };

    // Show no betting options message only if there are truly no odds available
    if (!bettingData || bettingData.length === 0) {
        return (
            <div className="bg-slate-100 min-h-[calc(100vh-198px)] flex flex-col items-center justify-center">
                <div className="text-center p-8 bg-white shadow-md">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        No Betting Options Available
                    </h2>
                    <p className="text-gray-600 mb-6">
                        There are currently no betting options available for this match.
                    </p>
                    <Button 
                        className="bg-base hover:bg-base-dark text-white font-medium py-2 px-6 shadow-sm" 
                        onClick={() => window.history.back()}
                    >
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-100 min-h-screen relative">
            {/* Main content - adjusts width when sidebar expands */}
            <div className="lg:mr-80 xl:mr-96">
                <div className="lg:p-2 xl:p-4">
                    <MatchHeader matchData={displayMatchData} />
                    <BettingTabs 
                        matchData={{ 
                            ...displayMatchData, 
                            betting_data: bettingData,
                            odds_classification: oddsClassification,
                            league: displayMatchData.league
                        }} 
                    />
                </div>
            </div>

            {/* Right sidebar - fixed position, doesn't move */}
            <div className="w-full lg:w-80 xl:w-96 lg:fixed lg:right-4 lg:top-40 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
                <div className="p-2 sm:p-3 md:p-4 lg:p-2">
                    <MatchVisualization matchData={displayMatchData} />
                </div>
            </div>
        </div>
    )
}

export default MatchDetailPage

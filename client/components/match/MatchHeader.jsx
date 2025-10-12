"use client"
import { useRef, useState, useEffect } from "react"
import { ChevronLeft, ChevronDown, Clock } from "lucide-react"
import MatchDropdown from "./MatchDropdown"
import LiveMatchClock from "./LiveMatchClock"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar"
import { Button } from "@/components/ui/button"
import { formatToLocalTime } from '@/lib/utils';
import Link from "next/link";
import apiClient from '@/config/axios';

const isMatchLive = (match) => {
    if (!match || !match.start) return false;
    const now = new Date();
    let matchTime;
    if (match.start.includes('T')) {
        matchTime = new Date(match.start.endsWith('Z') ? match.start : match.start + 'Z');
    } else {
        matchTime = new Date(match.start.replace(' ', 'T') + 'Z');
    }
    const matchEnd = new Date(matchTime.getTime() + 120 * 60 * 1000);
    return matchTime <= now && now < matchEnd;
};

// Live Timer Component - Now using LiveMatchClock
const LiveTimer = ({ matchId, isLive, onScoreUpdate }) => {
    return (
        <LiveMatchClock 
            matchId={matchId} 
            isLive={isLive} 
            onScoreUpdate={onScoreUpdate}
        />
    );
};

// Utility function to parse match name and extract home and away teams
const parseTeamsFromName = (matchName) => {
    if (!matchName) {
        return { homeTeam: null, awayTeam: null };
    }

    // Split by "vs" and trim whitespace
    const parts = matchName.split('vs').map(part => part.trim());
    
    if (parts.length === 2) {
        return {
            homeTeam: parts[0],
            awayTeam: parts[1]
        };
    }

    // Fallback if no "vs" found
    return { homeTeam: null, awayTeam: null };
};

const MatchHeader = ({ matchData, onScoreUpdate }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [currentScore, setCurrentScore] = useState('0-0')
    const [fetchedLiveData, setFetchedLiveData] = useState(null)
    const triggetRef = useRef(null)
    const router = useRouter()

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen)
    }

    // Fetch live match data with card details
    const fetchLiveData = async () => {
        if (!matchData?.id || !isLive) return;
        
        try {
            console.log('🔍 Fetching live data for match:', matchData.id);
            const response = await apiClient.get(`/api/live-matches/${matchData.id}/live`);
            
            if (response.data?.success && response.data?.liveData) {
                console.log('✅ Live data fetched:', response.data.liveData);
                setFetchedLiveData(response.data.liveData);
            }
        } catch (error) {
            console.error('❌ Error fetching live data:', error);
        }
    }

    if (!matchData) {
        return null;
    }

    // Handle both old and new API data formats
    const isLive = isMatchLive(matchData);
    
    // Get team names - try participants first (new API), then parse from name
    let homeTeam, awayTeam;
    if (matchData.participants && matchData.participants.length >= 2) {
        // New API format with participants
        const homeParticipant = matchData.participants.find(p => p.position === 'home');
        const awayParticipant = matchData.participants.find(p => p.position === 'away');
        homeTeam = homeParticipant?.name || 'Home';
        awayTeam = awayParticipant?.name || 'Away';
    } else {
        // Old API format - parse from name
        const { homeTeam: parsedHome, awayTeam: parsedAway } = parseTeamsFromName(matchData.name);
        homeTeam = parsedHome || 'Home';
        awayTeam = parsedAway || 'Away';
    }

    // Get league name and country
    const leagueName = matchData.league?.name || matchData.league || 'Unknown League';
    const country = matchData?.parentName || '';
    const displayLeagueName = country ? `${leagueName} (${country})` : leagueName;
    
    // Get league ID for navigation
    const leagueId = matchData?.groupId || matchData?.group || matchData?.league?.id || matchData?.leagueId;
    
    // Debug logging
    console.log('🔍 MatchHeader Debug:', {
        matchData,
        leagueName,
        country,
        parentName: matchData?.parentName,
        displayLeagueName,
        leagueId,
        'matchData.groupId': matchData?.groupId,
        'matchData.group': matchData?.group,
        'matchData.league?.id': matchData?.league?.id,
        'matchData.leagueId': matchData?.leagueId
    });

    // Get match time/score
    const matchTime = matchData.start ? formatToLocalTime(matchData.start) : 'TBD';
    
    // Get live data if available
    const liveData = matchData.liveData;
    const score = currentScore;
    const period = liveData?.period || '1st Half';
    const minute = liveData?.minute || '0';

    // Handle score updates from live data
    const handleScoreUpdate = (scoreData) => {
        console.log('📊 handleScoreUpdate called with:', scoreData);
        const homeScore = scoreData?.home ?? '0';
        const awayScore = scoreData?.away ?? '0';
        const newScore = `${homeScore} - ${awayScore}`;
        console.log('📊 Setting new score:', newScore);
        setCurrentScore(newScore);
        if (onScoreUpdate) {
            onScoreUpdate(scoreData);
        }
    };

    // Initialize score from matchData
    useEffect(() => {
        console.log('📊 Initializing score from matchData:', matchData);
        console.log('📊 matchData.liveData:', matchData.liveData);
        console.log('📊 matchData.liveData?.score:', matchData.liveData?.score);
        
        if (matchData.liveData?.score) {
            const scoreData = matchData.liveData.score;
            const homeScore = scoreData?.home ?? '0';
            const awayScore = scoreData?.away ?? '0';
            const newScore = `${homeScore} - ${awayScore}`;
            console.log('📊 Initial score set:', newScore);
            setCurrentScore(newScore);
        } else {
            console.log('📊 No live data score, setting default: 0 - 0');
            setCurrentScore('0 - 0');
        }
    }, [matchData.liveData?.score]);

    // Debug current score state
    useEffect(() => {
        console.log('📊 Current score state changed:', currentScore);
    }, [currentScore]);

    // Fetch live data when component mounts or match changes
    useEffect(() => {
        if (isLive && matchData?.id) {
            fetchLiveData();
            // Set up interval to refresh live data every 30 seconds
            const interval = setInterval(fetchLiveData, 30000);
            return () => clearInterval(interval);
        }
    }, [matchData?.id, isLive]);

    return (
        <div className="bg-white shadow-sm border p-4 mb-4">
            {/* Back button */}
            <div className="flex items-center mb-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="flex items-center text-gray-600 hover:text-gray-800"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                </Button>
            </div>

            {/* Match info */}
            <div className="text-center mb-4">
                <div className="text-sm font-medium text-gray-600 mb-2">
                    <Link 
                        href={`/leagues/${leagueId || 'unknown'}`}
                        className="hover:text-base hover:underline cursor-pointer transition-colors duration-200"
                    >
                        {displayLeagueName}
                    </Link>
                </div>
                <div className="flex items-center justify-center text-xs text-gray-500 mb-2">
                    {isLive ? (
                        <div className="flex items-center text-red-600 animate-pulse">
                            <div className="w-2 h-2 bg-red-600 rounded-full mr-2 animate-pulse"></div>
                            LIVE
                        </div>
                    ) : (
                        <div className="flex items-center text-gray-400">
                            <Clock className="h-3 w-3 mr-1" />
                            {matchTime}
                        </div>
                    )}
                </div>
            </div>

            {/* Teams */}
            <div className="flex items-center justify-between">
                {/* Home team */}
                <div className="flex-1 text-center">
                    <div className="text-xl font-bold text-gray-800">
                        {homeTeam}
                    </div>
                </div>

                {/* Score/Time */}
                <div className="flex-1 text-center">
                    {isLive ? (
                        <div className="space-y-1">
                            <div className="text-4xl font-bold text-gray-800">
                                {score}
                            </div>
                            <LiveTimer matchId={matchData.id} isLive={isLive} onScoreUpdate={handleScoreUpdate} />
                            
                            {/* Card details - only for live matches with statistics */}
                            {console.log('🔍 MatchHeader - Complete match data:', matchData)}
                            {console.log('🔍 MatchHeader - Live data:', liveData)}
                            {console.log('🔍 MatchHeader - Checking card data:', {
                                isLive,
                                hasLiveData: !!liveData,
                                hasStatistics: !!liveData?.statistics,
                                hasFootball: !!liveData?.statistics?.football,
                                liveData: liveData
                            })}
                            {(liveData?.statistics || isLive) && (
                                <div className="flex flex-col items-center gap-1 mt-2 text-sm">
                                    {/* Yellow cards */}
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 bg-yellow-500 border-0"></div>
                                        <span className="font-semibold text-gray-800">
                                            {liveData?.statistics?.football?.home?.yellowCards || 
                                             liveData?.statistics?.home?.yellowCards || 0} - {liveData?.statistics?.football?.away?.yellowCards || 
                                             liveData?.statistics?.away?.yellowCards || 0}
                                        </span>
                                    </div>
                                    {/* Red cards */}
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 bg-red-500 border-0"></div>
                                        <span className="font-semibold text-gray-800">
                                            {liveData?.statistics?.football?.home?.redCards || 
                                             liveData?.statistics?.home?.redCards || 0} - {liveData?.statistics?.football?.away?.redCards || 
                                             liveData?.statistics?.away?.redCards || 0}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-4xl font-bold text-gray-800">
                            {score}
                        </div>
                    )}
                </div>

                {/* Away team */}
                <div className="flex-1 text-center">
                    <div className="text-xl font-bold text-gray-800">
                        {awayTeam}
                    </div>
                </div>
            </div>

            {/* Match dropdown - COMMENTED OUT FOR NOW */}
            {/*
            <div className="mt-4 flex justify-center">
                <div className="relative">
                    <Button
                        ref={triggetRef}
                        variant="outline"
                        size="sm"
                        onClick={toggleDropdown}
                        className="flex items-center text-gray-600 hover:text-gray-800"
                    >
                        Match Info
                        <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                    
                    {isDropdownOpen && (
                        <MatchDropdown
                            matchData={matchData}
                            isOpen={isDropdownOpen}
                            onClose={() => setIsDropdownOpen(false)}
                            triggerRef={triggetRef}
                            currentLeagueId={matchData?.groupId || matchData?.group}
                        />
                    )}
                </div>
            </div>
            */}
        </div>
    );
};

export default MatchHeader;
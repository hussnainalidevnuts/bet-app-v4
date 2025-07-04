'use client';

import React from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import MatchCard from './MatchCard';
import { selectFootballDaily } from '@/lib/features/home/homeSlice';
import { formatMatchTime } from '@/lib/utils';

// Helper function to transform API data to MatchCard format
const transformApiMatchToDisplayFormat = (apiMatch, league) => {
    // Extract team names from the match name (e.g., "Hammarby vs Halmstad")
    const teamNames = apiMatch.name?.split(' vs ') || ['Team A', 'Team B'];

    // Extract main odds (1, X, 2) from the odds data
    const odds = {};
    if (apiMatch.odds) {
        if (typeof apiMatch.odds === 'object' && !Array.isArray(apiMatch.odds)) {
            if (apiMatch.odds.home && !isNaN(apiMatch.odds.home.value)) odds['1'] = { value: apiMatch.odds.home.value.toFixed(2), oddId: apiMatch.odds.home.oddId };
            if (apiMatch.odds.draw && !isNaN(apiMatch.odds.draw.value)) odds['X'] = { value: apiMatch.odds.draw.value.toFixed(2), oddId: apiMatch.odds.draw.oddId };
            if (apiMatch.odds.away && !isNaN(apiMatch.odds.away.value)) odds['2'] = { value: apiMatch.odds.away.value.toFixed(2), oddId: apiMatch.odds.away.oddId };
        } else if (Array.isArray(apiMatch.odds)) {
            // Legacy array format (if still present)
            apiMatch.odds.forEach(odd => {
                const label = odd.label?.toString().toLowerCase();
                const name = odd.name?.toString().toLowerCase();
                const value = parseFloat(odd.value);
                if (!isNaN(value)) {
                    if (label === '1' || label === 'home' || name === 'home') odds['1'] = { value: value.toFixed(2), oddId: odd.oddId };
                    if (label === 'x' || label === 'draw' || name === 'draw') odds['X'] = { value: value.toFixed(2), oddId: odd.oddId };
                    if (label === '2' || label === 'away' || name === 'away') odds['2'] = { value: value.toFixed(2), oddId: odd.oddId };
                }
            });
        }
    }

    // Use the new timezone helper with 12-hour format
    const { date: dateStr, time: timeStr, isToday, isTomorrow } = formatMatchTime(apiMatch?.starting_at || null);

    // Combine date and time for display
    let displayTime = timeStr;
    if (isToday) {
        displayTime = `Today ${timeStr}`;
    } else if (isTomorrow) {
        displayTime = `Tomorrow ${timeStr}`;
    }

    return {
        id: apiMatch.id,
        league: {
            name: league.name,
            imageUrl: league.imageUrl
        },
        team1: teamNames[0],
        team2: teamNames[1],
        date: dateStr,
        time: displayTime,
        odds: odds,
        clock: true
    };
};

const FootballDaily = () => {
    const footballDaily = useSelector(selectFootballDaily);

    if (!footballDaily || footballDaily.length === 0) {
        return (
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Football Daily</h2>
                    <Link href="#" className="text-green-600 hover:underline text-sm">View All</Link>
                </div>
                <div className="text-gray-500 text-center py-8">
                    No matches available at the moment.
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Football Daily</h2>
                <Link href="#" className="text-green-600 hover:underline text-sm">View All</Link>
            </div>

            {footballDaily.map((leagueGroup, index) => (
                <div key={leagueGroup.league?.id || index} className="mb-6">
                    <div className="flex items-center mb-3">
                        {leagueGroup.league?.imageUrl && (
                            <img
                                src={leagueGroup.league.imageUrl}
                                alt={leagueGroup.league.name}
                                className="w-6 h-6 mr-2 object-contain"
                            />
                        )}
                        <h3 className="text-lg font-semibold text-gray-700">
                            {leagueGroup.league?.name || 'Unknown League'}
                        </h3>
                        <span className="ml-2 text-sm text-gray-500">
                            ({leagueGroup.matches?.length || 0} matches)
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {leagueGroup.matches?.slice(0, 4).map((match) => (
                            <MatchCard key={match.id} match={transformApiMatchToDisplayFormat(match, leagueGroup.league)} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FootballDaily;

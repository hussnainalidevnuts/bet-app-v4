"use client"
import React, { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useBetting } from '@/hooks/useBetting';
import leaguesData from '@/data/dummayLeagues';

const LeagueAccordions = ({ leagueId }) => {
    const { createBetHandler } = useBetting();

    // Find the current league
    const currentLeague = leaguesData.find(league => league.id === parseInt(leagueId));
    const league = currentLeague || leaguesData[0];// Group matches by day/time periods
    const matchGroups = useMemo(() => {
        const groups = {};

        league.matches.forEach((match) => {
            // Group matches by their individual day property
            const groupKey = match.day || "Today";

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    id: groupKey.toLowerCase().replace(/\s+/g, '-'),
                    label: `${groupKey}`,
                    matches: []
                };
            }

            groups[groupKey].matches.push(match);
        });

        return Object.values(groups);
    }, [league]);

    return (
        <div className="space-y-3 bg-white h-full p-3">
            <Accordion type="multiple" className="space-y-2">
                {matchGroups.map((group) => (
                    <AccordionItem
                        key={group.id}
                        value={group.id}
                        className="bg-white border border-gray-200 overflow-hidden duration-200"
                    >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50/50 transition-colors duration-200 [&[data-state=open]]:bg-gray-50/80">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-sm font-semibold text-gray-900">{group.label}</h4>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                        {group.matches.length} matches
                                    </span>
                                </div>
                            </div>
                        </AccordionTrigger>                        <AccordionContent className="px-0 py-0 bg-gray-50/30">
                            {/* Odds Header */}
                            <div className="flex items-center px-4 py-2 bg-gray-100 border-b border-gray-200 flex-shrink-0">
                                <div className="flex-1 text-xs">{group.label.split(' ')[0]}</div>
                                <div className="flex gap-1">
                                    <div className="w-14 text-center text-xs text-gray-600 font-medium">1</div>
                                    <div className="w-14 text-center text-xs text-gray-600 font-medium">X</div>
                                    <div className="w-14 text-center text-xs text-gray-600 font-medium">2</div>
                                </div>
                            </div>

                            {/* Matches */}
                            <div className="p-4 py-0 flex-1 overflow-y-auto">
                                {group.matches.map((match, index) => (
                                    <MatchCard key={match.id} match={match} index={index} totalMatches={group.matches.length} />
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
};

// Individual Match Card Component - Similar to League Cards but for accordions
const MatchCard = ({ match, index, totalMatches }) => {
    return (
        <div key={match.id}>
            <div className='flex justify-between mt-2'>
                <div className="text-xs text-gray-600">{match.time}</div>
                <div className="text-xs text-gray-500">+358</div>
            </div>
            <Link href={`/matches/${match.id}`}>
                <div className="cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-1 rounded">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="text-[12px] mb-1" title={match.team1}>
                                {match.team1.length > 18 ? `${match.team1.slice(0, 18)}...` : match.team1}
                            </div>
                            <div className="text-[12px]" title={match.team2}>
                                {match.team2.length > 18 ? `${match.team2.slice(0, 18)}...` : match.team2}
                            </div>
                        </div>

                        <div className="flex items-center flex-shrink-0">                            <div className="flex gap-1">
                            {match.odds['1'] && (
                                <Button
                                    size={"sm"}
                                    className="w-14 h-8 p-0 text-xs font-bold betting-button"
                                    onClick={createBetHandler(match, '1', match.odds['1'])}
                                >
                                    {match.odds['1']}
                                </Button>
                            )}
                            {match.odds['X'] && (
                                <Button
                                    className="w-14 h-8 p-0 text-xs font-bold betting-button"
                                    size={"sm"}
                                    onClick={createBetHandler(match, 'X', match.odds['X'])}
                                >
                                    {match.odds['X']}
                                </Button>
                            )}
                            {match.odds['2'] && (
                                <Button
                                    size={"sm"}
                                    className="w-14 h-8 p-0 text-xs font-bold betting-button"
                                    onClick={createBetHandler(match, '2', match.odds['2'])}
                                >
                                    {match.odds['2']}
                                </Button>
                            )}
                        </div>
                        </div>
                    </div>
                </div>
            </Link>
            {index < totalMatches - 1 && (
                <div className="border-b border-gray-300 mx-0 my-2"></div>
            )}
        </div>
    );
};

export default LeagueAccordions;

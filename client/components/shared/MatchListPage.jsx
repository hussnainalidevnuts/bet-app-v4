'use client';

import React, { useState, useEffect } from 'react'; // Added useState and useEffect
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useBetting } from '@/hooks/useBetting';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from '@/components/ui/accordion';

const MatchListPage = ({ config }) => {
    const {
        pageTitle,
        breadcrumbText,
        fetchDataFunction,
        matchTimeFormatter,
        PageIcon,
        noMatchesConfig,
        viewAllMatchesLink = '/'
    } = config;

    const [leagues, setLeagues] = useState([]);
    const { createBetHandler } = useBetting();
    useEffect(() => {
        if (fetchDataFunction) {
            const data = fetchDataFunction();
            setLeagues(data);
        }
    }, [fetchDataFunction]);


    const defaultMatchTimeFormatter = (timeValue, match) => {

        if (match && match.liveTime) return timeValue || '--:--'; // For live matches
        if (match && match.startTime) { // For upcoming matches
            const date = new Date(timeValue);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
        }
        return timeValue || 'Not Available';
    };

    const effectiveMatchTimeFormatter = matchTimeFormatter || defaultMatchTimeFormatter;

    return (
        <div className="bg-slate-100 min-h-screen relative">
            {/* Main content */}
            <div className="lg:mr-80 xl:mr-96">
                <div className="p-2 sm:p-3 md:p-4">
                    {/* Header */}
                    <div className="mb-4 bg-white p-3 w-full md:w-screen"> {/* Adjusted width for responsiveness */}
                        {/* Breadcrumb */}
                        <div className="flex items-center text-xs text-slate-500 mb-3">
                            <Link href="/" className="flex items-center hover:text-slate-700">
                                <ChevronLeft className="h-4 w-4" />
                                <span className="ml-1 truncate">{breadcrumbText}</span>
                            </Link>
                        </div>

                        {/*INFO: Page Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {PageIcon && <PageIcon className="h-4 w-4 text-red-500" />}
                                <div className='flex flex-col'>
                                    <h1 className="text-lg font-semibold ">{pageTitle}</h1>
                                    <p className="text-xs text-gray-500">
                                        {leagues.reduce((total, league) => total + league.matches.length, 0)} matches
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    {leagues.length === 0 ? (
                        <div className="bg-white p-8 text-center">
                            {noMatchesConfig.Icon && <noMatchesConfig.Icon className="h-16 w-16 text-gray-300 mx-auto mb-4" />}
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                {noMatchesConfig.title}
                            </h3>
                            <p className="text-gray-500 mb-4">
                                {noMatchesConfig.message}
                            </p>
                            <Link href={noMatchesConfig.buttonLink || viewAllMatchesLink}>
                                <Button variant="outline">
                                    {noMatchesConfig.buttonText}
                                </Button>
                            </Link>
                        </div>
                    ) : (<div className="space-y-4">
                        <Accordion type="multiple" className="space-y-4" defaultValue={[]}>
                            {leagues.map((league) => (
                                <AccordionItem
                                    key={league.id}
                                    value={`league-${league.id}`}
                                    className="bg-white border border-gray-200 overflow-hidden"
                                >
                                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50/50 transition-colors duration-200 [&[data-state=open]]:bg-gray-50/80">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">{league.icon}</span>
                                                <div className="text-left">
                                                    <p className="text-[13px]">{league.name}</p>
                                                    <p className="text-xs text-gray-500 font-normal">
                                                        {league.matches.length} {league.matches.length === 1 ? 'match' : 'matches'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-0 pb-0">
                                        {/* Odds Header */}
                                        <div className="flex items-center px-4 py-2 bg-gray-100 border-t border-gray-200">
                                            <div className="flex-1 text-xs font-medium text-gray-700">Match</div>
                                            <div className="flex gap-1 items-center">
                                                <div className="w-14 text-center text-xs font-medium text-gray-700">1</div>
                                                <div className="w-14 text-center text-xs font-medium text-gray-700">X</div>
                                                <div className="w-14 text-center text-xs font-medium text-gray-700">2</div>
                                            </div>
                                        </div>

                                        {/* Matches */}
                                        <div className="divide-y divide-gray-100">
                                            {league.matches.map((match) => (
                                                <div key={match.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            {/* Match Time/Date and Indicator */}
                                                            <div className="flex items-center justify-between mb-1.5"> {/* Reduced margin */}
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-semibold ">
                                                                        {effectiveMatchTimeFormatter(match.liveTime || match.startTime, match)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Teams and Scores */}
                                                            <Link href={`/matches/${match.id}`}>
                                                                <div className="cursor-pointer">                                                                        <div className="space-y-1">
                                                                    <div className="flex items-center gap-3" title={match.team1}>
                                                                        {match.score?.team1 !== undefined && (
                                                                            <span className="font-bold text-gray-900 min-w-[20px] text-center">
                                                                                {match.score.team1}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-xs text-gray-800 truncate" style={{ maxWidth: '150px' }}>
                                                                            {match.team1}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3" title={match.team2}>
                                                                        {match.score?.team2 !== undefined && (
                                                                            <span className="font-bold text-gray-900 min-w-[20px] text-center">
                                                                                {match.score.team2}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-xs text-gray-800 truncate" style={{ maxWidth: '150px' }}>
                                                                            {match.team2}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                </div>
                                                            </Link>
                                                        </div>                                                        {/* Betting Buttons */}
                                                        <div className="flex gap-1 ml-2 md:ml-4"> {/* Adjusted margin for responsiveness */}
                                                            {match.odds && match.odds['1'] && (
                                                                <Button
                                                                    size="sm"
                                                                    className="w-12 h-8 md:w-14 p-0 text-xs font-bold betting-button"
                                                                    onClick={createBetHandler(match, '1', match.odds['1'])}
                                                                >
                                                                    {match.odds['1']}
                                                                </Button>
                                                            )}
                                                            {match.odds && match.odds['X'] && (
                                                                <Button
                                                                    size="sm"
                                                                    className="w-12 h-8 md:w-14 p-0 text-xs font-bold betting-button"
                                                                    onClick={createBetHandler(match, 'X', match.odds['X'])}
                                                                >
                                                                    {match.odds['X']}
                                                                </Button>
                                                            )}
                                                            {match.odds && match.odds['2'] && (
                                                                <Button
                                                                    size="sm"
                                                                    className="w-12 h-8 md:w-14 p-0 text-xs font-bold betting-button"
                                                                    onClick={createBetHandler(match, '2', match.odds['2'])}
                                                                >
                                                                    {match.odds['2']}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchListPage;

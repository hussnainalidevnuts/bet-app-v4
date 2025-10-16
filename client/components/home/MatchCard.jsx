'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBetting } from '@/hooks/useBetting';
import { getBetLabel } from '@/lib/utils';
import { getFotmobLogoByUnibetId } from '@/lib/leagueUtils';

const MatchCard = ({ match }) => {
    const { createBetHandler } = useBetting();


    // Helper function to create bet object for label formatting
    

    return (
        <Link href={`/matches/${match.id}`}>
            <div className=" bg-white border border-gray-200 cursor-pointer rounded-none shadow-none">
                <div className="p-4">

                    <div className='flex align-center gap-2 justify-start mb-2 '>
                        {(getFotmobLogoByUnibetId(match.league.id) || match.league.imageUrl) ? (
                            <img 
                                src={getFotmobLogoByUnibetId(match.league.id) || match.league.imageUrl} 
                                className='w-4 h-4 object-contain' 
                                alt={match.league.name}
                                onError={e => { e.target.style.display = 'none'; }}
                            />
                        ) : match.league.icon ? (
                            <span className="text-green-400 text-sm">{match.league.icon}</span>
                        ) : null}
                        <div className="text-xs text-gray-500 ">{match.league.name}</div>
                    </div>

                    <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                            <div className="font-medium text-sm mb-1">{match.team1}</div>
                            <div className="font-medium text-sm">{match.team2}</div>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                {match.clock && <span>⏰</span>}
                                <span>{match.date}</span>
                            </div>
                            <div>{match.time}</div>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        {match.odds['1'] && (
                            <Button
                                size={"sm"}
                                className="flex-1 flex justify-between py-2 gap-0 betting-button"
                                onClick={createBetHandler(match, "Home", match.odds['1'].value, '1x2', match.odds['1'].oddId, { 
                                    marketId: "1", 
                                    label: "Home", 
                                    name: `Win - ${match.team1}`, 
                                    marketDescription: "Full Time Result" 
                                })}
                            >
                                <div className="text-[11px]">1</div>
                                <div className='text-[13px]  font-bold'>{match.odds['1'].value}</div>
                            </Button>
                        )}
                        {match.odds['X'] && (
                            <Button
                                className="flex-1 flex justify-between py-2  gap-0 betting-button"
                                size={"sm"}
                                onClick={createBetHandler(match, "Draw", match.odds['X'].value, '1x2', match.odds['X'].oddId, { marketId: "1", label: "Draw", name: `Draw - ${match.team1} vs ${match.team2}`, marketDescription: "Full Time Result" })}
                            >
                                <div className="text-[11px]">X</div>
                                <div className='text-[13px] font-bold'>{match.odds['X'].value}</div>
                            </Button>
                        )}
                        {match.odds['2'] && (
                            <Button
                                size={"sm"}
                                className="flex-1 flex justify-between py-2  gap-0 betting-button"
                                onClick={createBetHandler(match, "Away", match.odds['2'].value, '1x2', match.odds['2'].oddId, { marketId: "1", label: "Away", name: `Win - ${match.team2}`, marketDescription: "Full Time Result" })}
                            >
                                <div className="text-[11px]">2</div>
                                <div className='text-[13px] font-bold'>{match.odds['2'].value}</div>
                            </Button>
                        )}
                        
                        {/* Show message when no odds are available */}
                        {(!match.odds || Object.keys(match.odds).length === 0) && (
                            <div className="flex-1 text-center py-2 text-xs text-gray-500 bg-gray-50 rounded">
                                Odds not available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default MatchCard;

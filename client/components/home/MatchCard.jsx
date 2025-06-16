'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBetting } from '@/hooks/useBetting';

const MatchCard = ({ match }) => {
    const { createBetHandler } = useBetting();

    return (
        <Link href={`/matches/${match.id}`}>
            <div className=" bg-white border border-gray-200 cursor-pointer rounded-none shadow-none">
                <div className="p-4">
                    <div className="text-xs text-gray-500 mb-2">{match.tournament}</div>

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
                    </div>                    <div className="flex gap-1">
                        {match.odds['1'] && (
                            <Button
                                size={"sm"}
                                className="flex-1 flex justify-between py-2 gap-0 betting-button"
                                onClick={createBetHandler(match, '1', match.odds['1'])}
                            >
                                <div className="text-[11px]">1</div>
                                <div className='text-[13px]  font-bold'>{match.odds['1']}</div>
                            </Button>
                        )}
                        {match.odds['X'] && (
                            <Button
                                className="flex-1 flex justify-between py-2  gap-0 betting-button"
                                size={"sm"}
                                onClick={createBetHandler(match, 'X', match.odds['X'])}
                            >
                                <div className="text-[11px]">X</div>
                                <div className='text-[13px] font-bold'>{match.odds['X']}</div>
                            </Button>
                        )}
                        {match.odds['2'] && (
                            <Button
                                size={"sm"}
                                className="flex-1 flex justify-between py-2  gap-0 betting-button"
                                onClick={createBetHandler(match, '2', match.odds['2'])}
                            >
                                <div className="text-[11px]">2</div>
                                <div className='text-[13px] font-bold'>{match.odds['2']}</div>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default MatchCard;

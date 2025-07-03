"use client"
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronDown } from "lucide-react";
import LeagueDropdown from "./LeagueDropdown";
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { selectPopularLeagues, fetchPopularLeagues } from '@/lib/features/leagues/leaguesSlice';

const LeagueHeader = ({ league }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const triggerRef = useRef(null);
    const router = useRouter();
    const dispatch = useDispatch();
    const leagues = useSelector(selectPopularLeagues);
    
    // Fetch leagues data on component mount
    useEffect(() => {
        dispatch(fetchPopularLeagues());
    }, [dispatch]);

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const closeDropdown = () => {
        setIsDropdownOpen(false);
    };

    return (
        <div className="mb-4 bg-white p-3 w-screen">
            {/* Breadcrumb */}
            <button type="button" className="flex cursor-pointer items-center text-xs text-slate-500 hover:text-slate-600 transition-all mb-3" onClick={() => router.back()}
            >
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-1 truncate">Football | {league?.name} </span>
            </button>

            {/* League Header */}
            <div className="relative">
                <div className="p-4 pl-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div
                            className="flex items-center cursor-pointer hover:bg-gray-50 py-2 px-3 rounded-2xl transition-colors"
                            onClick={e => { e.stopPropagation(); toggleDropdown(); }}
                            ref={triggerRef}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleDropdown(); } }}
                        >
                            <div className="flex items-center space-x-3">
                                {league?.imageUrl && (
                                    <img src={league.imageUrl} alt={league?.name} className="text-2xl h-7 w-7" />
                                )}
                                <span className="text-lg font-medium">{league?.name}</span>
                            </div>
                            <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                    </div>
                </div>

                <LeagueDropdown
                    leagues={leagues}
                    isOpen={isDropdownOpen}
                    onClose={closeDropdown}
                    triggerRef={triggerRef}
                    currentLeagueId={league?.id}
                />
            </div>
        </div >
    );
};

export default LeagueHeader;

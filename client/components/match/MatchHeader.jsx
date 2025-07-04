"use client"
import { useRef, useState } from "react"
import { ChevronLeft, ChevronDown, Clock } from "lucide-react"
import MatchDropdown from "./MatchDropdown"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar"
import { formatToLocalTime } from '@/lib/utils';

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

const MatchHeader = ({ matchData }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const triggetRef = useRef(null)
    const router = useRouter()

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen)
    }

    const closeDropdown = () => {
        setIsDropdownOpen(false)
    }

    // Show loading state if no matchData
    if (!matchData) {
        return (
            <div className="mb-4 bg-white p-3">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-4 bg-white p-3">
            {/* Breadcrumb */}
            <button
                onClick={() => { router.back() }}
                className="flex cursor-pointer items-center text-xs text-slate-500 mb-3 hover:text-slate-600 transition-all" >
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-1 truncate">Football | {matchData.league?.name || 'League'}</span>
                {/* <span className="ml-1"> <img src={`${matchData.league.image_path}`} className="h-3 w-3" alt="" /> </span> */}
            </button>

            {/* Match Header */}
            <div className="relative">
                <div className="p-4 pl-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div
                            className="flex items-center cursor-pointer hover:bg-gray-50 py-2 px-3 rounded-2xl transition-colors"
                            onClick={toggleDropdown}
                            ref={triggetRef}
                        >
                            <div className="flex items-center space-x-3">
                                <Avatar>
                                    <AvatarImage className="w-10 h-10" src={`${matchData.participants?.[0]?.image_path}`} alt="@shadcn" />
                                    <AvatarFallback>HomeTeam</AvatarFallback>
                                </Avatar>
                                <span className="text-base font-medium">{matchData.participants?.[0]?.name || 'Home Team'}</span>
                                <span className=" text-slate-400">vs</span>
                                <span className="text-base font-medium">{matchData.participants?.[1]?.name || 'Away Team'}</span>
                                <Avatar>
                                    <AvatarImage className="w-10 h-10" src={`${matchData.participants?.[1]?.image_path}`} alt="@shadcn" />
                                    <AvatarFallback>HomeTeam</AvatarFallback>
                                </Avatar>
                                {isMatchLive(matchData) && (
                                    <span className="ml-3 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded shadow animate-pulse">LIVE</span>
                                )}
                            </div>
                            <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        <div className="flex items-center text-xs text-slate-500">
                            <Clock className="h-3.5 w-3.5 mr-1.5" />
                            <span className="whitespace-nowrap">
                                {matchData.starting_at ? formatToLocalTime(matchData.starting_at, { showDate: true, showTime: true, showYear: true }) : 'TBD'}
                            </span>
                        </div>
                    </div>
                </div>
                {/* MatchDropdown temporarily disabled - replace with real data later */}
                <MatchDropdown
                    isOpen={isDropdownOpen}
                    onClose={closeDropdown}
                    triggerRef={triggetRef}
                    currentMatchId={matchData.id}
                    currentLeagueId={matchData.league?.id}
                />
            </div>
        </div>
    )
}

const TeamBadge = ({ country, color }) => {
    return (
        <div className={`w-6 h-6 ${color} rounded-full flex items-center justify-center shadow-sm`}>
            <span className="text-white text-[8px] font-medium">{country}</span>
        </div>
    )
}

export default MatchHeader
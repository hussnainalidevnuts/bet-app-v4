"use client"
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { X, ChevronLeft } from 'lucide-react';

// Jersey Image Component
const JerseyImage = ({ src, alt, className = "w-12 h-12" }) => {
    return (
        <div className={`${className} flex-shrink-0`}>
            <img
                src={src}
                alt={alt}
                className="w-full h-full object-contain"
                onError={(e) => {
                    // Fallback to a simple colored circle if image fails
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                }}
            />
            <div
                className="w-full h-full bg-gray-500 rounded-full hidden"
                style={{ display: 'none' }}
            />
        </div>
    );
};

const MatchDropdown = ({ matches, isOpen, onClose, currentMatchId, triggerRef }) => {
    const dropdownRef = useRef(null);
    const [showLeagues, setShowLeagues] = useState(false);
    const [selectedCompetition, setSelectedCompetition] = useState(null);
    const router = useRouter();
    const handleClose = useCallback(() => {
        setSelectedCompetition(null);
        setShowLeagues(false);
        onClose();
    }, [onClose]); useEffect(() => {
        if (!isOpen) return;

        console.log('Setting up event listeners for dropdown');

        const handleClick = (event) => {
            console.log('=== CLICK EVENT ===');
            console.log('Event target:', event.target);
            console.log('Event type:', event.type);
            console.log('Event currentTarget:', event.currentTarget);
            console.log('Dropdown ref exists:', !!dropdownRef.current);
            console.log('Contains check:', dropdownRef.current?.contains(event.target));

            // Check if the click is outside the dropdown
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                console.log('✅ Click outside detected, closing dropdown');
                onClose();
            } else {
                console.log('❌ Click inside dropdown, not closing');
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                console.log('Escape key pressed, closing dropdown');
                onClose();
            }
        };        // Add all possible event listeners
        console.log('Adding event listeners...');

        // Simple global click detector for testing
        const globalClickDetector = (e) => {
            console.log('🌍 GLOBAL CLICK DETECTED:', e.target.tagName, e.target.className);
        };

        document.addEventListener('click', globalClickDetector, true);
        document.addEventListener('click', handleClick, true);
        document.addEventListener('mousedown', handleClick, true);
        document.addEventListener('touchstart', handleClick, true);
        document.addEventListener('keydown', handleEscape);

        // Also add without capture for comparison
        document.addEventListener('click', handleClick, false);
        document.addEventListener('mousedown', handleClick, false);

        return () => {
            console.log('Removing event listeners...');
            document.removeEventListener('click', globalClickDetector, true);
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('mousedown', handleClick, true);
            document.removeEventListener('touchstart', handleClick, true);
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('click', handleClick, false);
            document.removeEventListener('mousedown', handleClick, false);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Find current match to get its competition
    const currentMatch = matches.find(match => match.id === currentMatchId);
    const currentCompetition = currentMatch?.competition || "European U21 Championship";

    // Use selected competition if available, otherwise use current competition
    const displayCompetition = selectedCompetition || currentCompetition;

    // Filter matches by the display competition
    const currentLeagueMatches = matches.filter(match => match.competition === displayCompetition);

    // Get all unique competitions for leagues list
    const allCompetitions = [...new Set(matches.map(match => match.competition))];

    const handleBackToMatches = () => {
        setShowLeagues(false);
    };

    const handleShowLeagues = () => {
        setShowLeagues(true);
    };


    const handleSelectLeague = (competition) => {
        // Set the selected competition and go back to matches view
        setSelectedCompetition(competition);
        setShowLeagues(false);
    }; if (showLeagues) {
        return (
            <div className="absolute top-full left-0 z-50 mt-2 w-[500px]" ref={dropdownRef}>
                <Card className="border border-gray-300 shadow-xl bg-gray-800 w-full max-h-96 overflow-y-auto transform transition-all duration-300 ease-in-out dropdown-scrollbar">
                    <CardContent className="p-0">
                        {/* Header with back and close buttons */}
                        <div className="bg-emerald-600 p-4 border-b border-gray-600 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={handleBackToMatches}
                                    className="text-white cursor-pointer hover:text-gray-200 transition-colors duration-200 p-1 hover:bg-emerald-700 rounded"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <h3 className="text-white font-semibold text-base">Leagues</h3>
                            </div>
                            <button
                                onClick={handleClose}
                                className="text-white cursor-pointer hover:text-gray-200 transition-colors duration-200 p-1 hover:bg-emerald-700 rounded"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="animate-fadeIn">
                            {allCompetitions.map((competition, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSelectLeague(competition)}
                                    className="w-full text-left p-3 text-white hover:bg-gray-700 transition-colors duration-200 border-b border-gray-600 last:border-b-0 cursor-pointer text-sm"
                                >
                                    <span>{competition}</span>
                                </button>
                            ))}
                        </div>                    </CardContent>
                </Card>
            </div>
        );
    } return (
        <div className="absolute top-full left-0 z-50 mt-2 w-[500px]" ref={dropdownRef}>
            <Card className="border border-gray-300 shadow-xl bg-gray-800 w-full max-h-96 overflow-y-auto transform transition-all duration-300 ease-in-out dropdown-scrollbar">
                <CardContent className="p-0">
                    {/* Header with back and close buttons */}
                    <div className="bg-emerald-600 p-4 border-b border-gray-600 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={handleShowLeagues}
                                className="text-white cursor-pointer hover:text-gray-200 transition-colors duration-200 p-1 hover:bg-emerald-700 rounded"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <h3 className="text-white font-semibold text-base">{displayCompetition}</h3>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-white cursor-pointer hover:text-gray-200 transition-colors duration-200 p-1 hover:bg-emerald-700 rounded"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    {/* Date header */}
                    <div className="bg-gray-700 p-3 text-center">
                        <span className="text-white text-sm font-medium">Thu 12 Jun</span>
                    </div>
                    <div className="divide-y divide-gray-600 animate-fadeIn">
                        {currentLeagueMatches.slice(0, 4).map((match) => (
                            <Link
                                key={match.id}
                                href={`/matches/${match.id}`}
                                onClick={onClose}
                                className="block hover:bg-gray-700 cursor-pointer transition-colors duration-200"
                            >
                                <div className="p-4 bg-gray-800">
                                    <div className="flex items-center justify-between">
                                        {/* Home Team */}
                                        <div className="flex flex-col items-center flex-1">
                                            <JerseyImage
                                                src={match.homeTeam.jerseyImage}
                                                alt={`${match.homeTeam.name} jersey`}
                                                className="w-12 h-12 mb-2"
                                            />
                                            <span className="text-white text-xs font-medium text-center leading-tight">
                                                {match.homeTeam.name}
                                            </span>
                                        </div>
                                        {/* Time */}
                                        <div className="text-center flex-shrink-0 px-4">
                                            <div className="text-white font-bold text-sm">
                                                {match.time}
                                            </div>
                                        </div>
                                        {/* Away Team */}
                                        <div className="flex flex-col items-center flex-1">
                                            <JerseyImage
                                                src={match.awayTeam.jerseyImage}
                                                alt={`${match.awayTeam.name} jersey`}
                                                className="w-12 h-12 mb-2"
                                            />
                                            <span className="text-white text-xs font-medium text-center leading-tight">
                                                {match.awayTeam.name}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>                    </CardContent>
            </Card>
        </div>
    );
};

export default MatchDropdown;

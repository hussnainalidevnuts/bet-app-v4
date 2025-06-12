'use client';

import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Pin } from 'lucide-react';
import { useCustomSidebar } from '../../contexts/SidebarContext.js';

const Sidebar = () => {
    const context = useCustomSidebar();
    console.log('Raw context from useCustomSidebar:', context);
    console.log('Context keys:', Object.keys(context || {}));

    const { isCollapsed, setIsCollapsed, isPinned, setIsPinned } = context || {};

    // Debug log
    console.log('Sidebar context:', { isCollapsed, setIsCollapsed, isPinned, setIsPinned });

    const sidebarRef = useRef(null);
    const hoverTimeoutRef = useRef(null);

    const popularSports = [
        { name: 'Odds Boost', icon: '💫', count: null },
        { name: 'Champions League', icon: '⚽', count: null },
        { name: 'Premier League', icon: '⚽', count: null },
        { name: 'NBA', icon: '🏀', count: null },
        { name: 'NHL', icon: '🏒', count: null },
        { name: 'La Liga', icon: '⚽', count: null },
    ];

    // Handle mouse enter
    const handleMouseEnter = () => {
        if (!isPinned) {
            // Clear any existing timeout
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
            setIsCollapsed(false);
        }
    };    // Handle mouse leave
    const handleMouseLeave = () => {
        if (!isPinned) {
            // Add a small delay to prevent flickering
            hoverTimeoutRef.current = setTimeout(() => {
                setIsCollapsed(true);
            }, 50);
        }
    };// Toggle pin state
    const togglePin = () => {


        if (typeof setIsPinned !== 'function') {
            console.error('setIsPinned is not a function!', { setIsPinned });
            return;
        }

        try {
            setIsPinned(!isPinned);
            if (!isPinned) {
                setIsCollapsed(false);

            }
        } catch (error) {
            console.error('Error in togglePin:', error);
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            ref={sidebarRef}
            className={`${isCollapsed ? 'w-16' : 'w-56'} bg-gray-800 text-white h-full transition-all duration-300 flex-shrink-0 overflow-y-auto`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Header with Pin Button */}
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                {!isCollapsed && (
                    <div className="flex items-center text-sm">
                        <span className="mr-2">🌐</span>
                        <span>EN</span>
                    </div>
                )}
                <button
                    onClick={togglePin}
                    className={`p-1 hover:bg-gray-700 rounded transition-colors ${isPinned ? 'text-blue-400' : 'text-gray-400'
                        }`}
                    title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                >
                    <Pin
                        size={16}
                        className={`transition-transform ${isPinned ? 'rotate-45' : ''}`}
                    />
                </button>
            </div>

            {!isCollapsed && (
                <>
                    {/* Popular section */}
                    <div className="p-4">
                        <h3 className="text-sm font-semibold mb-3">POPULAR LEAGUES</h3>
                        <div className="space-y-1">                            {popularSports.map((sport, index) => (
                            <div key={index} className="flex items-center py-2 px-3 hover:bg-gray-700 rounded cursor-pointer">
                                <span className="text-green-400 mr-3">{sport.icon}</span>
                                <span className="text-sm">{sport.name}</span>
                            </div>
                        ))}
                        </div>
                    </div>

                    {/* Pin status indicator */}
                    {isPinned && (
                        <div className="px-4 pb-2">
                            <div className="text-xs text-blue-400 flex items-center">
                                <Pin size={12} className="mr-1 rotate-45" />
                                Sidebar pinned
                            </div>
                        </div>
                    )}
                </>
            )}

            {isCollapsed && (
                <div className="p-2 space-y-2">
                    {/* Collapsed view - show only icons */}
                    <div className="flex flex-col items-center space-y-3 pt-4">                        {popularSports.slice(0, 6).map((sport, index) => (
                        <div key={index} className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center cursor-pointer transition-colors">
                            <span className="text-sm">{sport.icon}</span>
                        </div>
                    ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
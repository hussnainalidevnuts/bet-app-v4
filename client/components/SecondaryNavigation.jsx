"use client"
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Clock, PlayCircle, Search, Calendar, History } from "lucide-react"
import { useEffect, useState, useRef } from 'react'

const SecondaryNavigation = () => {
    const pathname = usePathname()
    const [headerHeight, setHeaderHeight] = useState(0)
    const [isMobile, setIsMobile] = useState(false)
    const navRef = useRef(null)

    const getActiveTab = (pathname) => {
        if (pathname === '/') return 'HOME';
       
        if (pathname === '/inplay') return 'IN-PLAY';
        if (pathname.includes('/upcoming')) return 'UPCOMING';
        if (pathname === '/betting-history') return 'BET HISTORY';
        return 'HOME'; // Default to HOME
    }

    const activeTab = getActiveTab(pathname)

    // Detect mobile vs desktop and calculate header height
    useEffect(() => {
        const checkMobile = () => {
            // Check if screen is mobile (below md breakpoint = 768px)
            const mobile = window.innerWidth < 768
            setIsMobile(mobile)
            return mobile
        }

        const calculateHeaderHeight = () => {
            const isMobileView = checkMobile()
            
            // Only calculate header height on mobile (where header is sticky)
            // On desktop, header is relative, so SecondaryNavigation should stick at top-0
            if (isMobileView) {
                // Find the header element
                const header = document.querySelector('header')
                if (header) {
                    const height = header.offsetHeight
                    setHeaderHeight(height)
                    console.log('📏 [Mobile] Header height calculated:', height)
                } else {
                    // Fallback: use default header height on mobile (~64px)
                    setHeaderHeight(64)
                }
            } else {
                // Desktop: header is relative, so no offset needed
                setHeaderHeight(0)
                console.log('📏 [Desktop] Header is relative, using top-0')
            }
        }

        // Calculate on mount
        calculateHeaderHeight()

        // Recalculate on resize (for responsive changes)
        window.addEventListener('resize', calculateHeaderHeight)
        
        // Recalculate after a short delay to ensure DOM is ready
        const timeoutId = setTimeout(calculateHeaderHeight, 100)

        return () => {
            window.removeEventListener('resize', calculateHeaderHeight)
            clearTimeout(timeoutId)
        }
    }, [])

    const navigationItems = [
        { icon: <Home className="h-3 w-3" />, label: "HOME", href: "/" },
        { icon: <PlayCircle className="h-3 w-3" />, label: "IN-PLAY", href: "/inplay" },
        { icon: <Clock className="h-3 w-3" />, label: "UPCOMING", href: "/upcoming" },
        { icon: <History className="h-3 w-3" />, label: "BET HISTORY", href: "/betting-history" },
    ];

    // On mobile: stick below header (headerHeight), On desktop: stick at top-0
    const stickyTop = isMobile && headerHeight > 0 ? `${headerHeight}px` : '0px'

    return (
        <div 
            ref={navRef}
            className="bg-slate-800 text-white sticky z-50 py-2"
            style={{
                top: stickyTop
            }}
        >
            {/* Unified Navigation View for all screen sizes */}
            <div className="px-4">
                <div className="flex items-center justify-between">
                    {/* Navigation items container with horizontal scroll */}
                    <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto scrollbar-hide flex-1">
                        {navigationItems.map((item, index) => (
                            <NavItem
                                key={index}
                                icon={item.icon}
                                label={item.label}
                                href={item.href}
                                active={activeTab === item.label} // Simplified active logic
                            />
                        ))}
                    </div>
                    {/* Search icon container */}
                    {/* <div className="flex items-center">
                        <Search className="h-4 w-4 cursor-pointer" />
                    </div> */}
                </div>
            </div>
        </div>
    )
}

const NavItem = ({ icon, label, href, active = false }) => {
    const content = (
        <div
            className={`flex items-center space-x-1 px-2 py-1 rounded-3xl transition-colors ${active ? "bg-emerald-600 text-white" : "hover:bg-slate-700 text-slate-200"
                } cursor-pointer whitespace-nowrap`}
        >
            {icon}
            <span className="text-xs font-medium">{label}</span> {/* Always display full label */}
        </div>
    )

    if (href) {
        return <Link href={href}>{content}</Link>
    }

    return content
}

export default SecondaryNavigation

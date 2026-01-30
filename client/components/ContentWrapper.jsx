'use client';

import { useCustomSidebar } from '@/contexts/SidebarContext.js';

const ContentWrapper = ({ children }) => {
    const { isCollapsed, isMobile } = useCustomSidebar();

    return (
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
            !isMobile && !isCollapsed ? 'ml-6' : ''
        }`}>
            {/* SecondaryNavigation removed - now in Header */}
            {/* Mobile: top/bottom padding (same as former iPhone 13 mini fix) on all mobile for safe area and scroll */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden pt-[100px] pb-[100px] md:pt-0 md:pb-0">
                {children}
            </main>
        </div>
    );
};

export default ContentWrapper;



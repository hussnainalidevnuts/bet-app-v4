'use client';

import { useCustomSidebar } from '@/contexts/SidebarContext.js';
import SecondaryNavigation from '@/components/SecondaryNavigation';

const ContentWrapper = ({ children }) => {
    const { isCollapsed } = useCustomSidebar();
    return (
        <div className={`flex-1 overflow-x-hidden overflow-y-auto flex flex-col lg:h-[calc(100vh-120px)] transition-all duration-300 ${isCollapsed ? '' : 'lg:ml-6'}`}>
            <SecondaryNavigation />
            <main className="flex-1 w-full lg:h-[calc(100vh-120px)]">
                {children}
            </main>
        </div>
    );
};

export default ContentWrapper;



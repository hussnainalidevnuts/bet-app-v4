'use client';

import { useCustomSidebar } from '@/contexts/SidebarContext.js';
import SecondaryNavigation from '@/components/SecondaryNavigation';
import { usePathname } from 'next/navigation';

const ContentWrapper = ({ children }) => {
    const { isCollapsed, isMobile } = useCustomSidebar();
    const pathname = usePathname();
    const isAdminPage = pathname?.startsWith('/admin');

    return (
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
            !isMobile && !isCollapsed ? 'ml-6' : ''
        }`}>
            {!isAdminPage && <SecondaryNavigation />}
            <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
                {children}
            </main>
        </div>
    );
};

export default ContentWrapper;



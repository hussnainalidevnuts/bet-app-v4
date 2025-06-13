'use client';

import React from 'react';
import TopPicks from './TopPicks';
import LeagueCards from './LeagueCards';
import LoginDialog from '@/components/auth/LoginDialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';


const HomePage = () => {
    return (
        <div className="flex-1 bg-gray-100">            <div className="p-3 lg:p-6 overflow-hidden">
            {/* Auth Demo Section */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Authentication Demo</h2>
                <div className="flex gap-4 flex-wrap">
                    <LoginDialog>
                        <Button variant="outline" className="bg-blue-600 text-white hover:bg-blue-700">
                            Open Login Dialog
                        </Button>
                    </LoginDialog>
                    <Link href="/signup">
                        <Button variant="outline" className="bg-green-600 text-white hover:bg-green-700">
                            Go to Signup Page
                        </Button>
                    </Link>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                    <p>• Login opens as a dialog for quick access</p>
                    <p>• Signup is a dedicated page with full form validation</p>
                    <p>• Phone number validation and 18+ age verification included</p>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-4 lg:gap-6">{/* Main content area */}
                <div className="flex-1 min-w-0">
                    <TopPicks />
                    {/* <BetBuilderHighlights /> */}

                    {/* Regular League Cards */}
                    <LeagueCards />
                    {/* In-Play Section */}
                    <LeagueCards
                        title="In-Play"
                        isInPlay={true}
                        showDayTabs={false}
                        viewAllText="View All Live Football"
                    />

                </div>

                {/* Right sidebar */}
                {/* <div className="w-full xl:w-80 xl:flex-shrink-0">
                        <TrendingCombo />
                    </div> */}
            </div>
        </div>
        </div>
    );
};

export default HomePage;

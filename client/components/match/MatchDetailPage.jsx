"use client"
import MatchHeader from "./MatchHeader"
import BettingTabs from "./BettingTabs"
import MatchVisualization from "./MatchVisualization"
import { useCustomSidebar } from "@/contexts/SidebarContext.js"

const MatchDetailPage = ({ matchId }) => {


    return (
        <div className="bg-slate-100 min-h-screen relative">
            {/* Main content - adjusts width when sidebar expands */}
            <div className="lg:mr-80 xl:mr-96">
                <div className="p-2 sm:p-3 md:p-4">
                    <MatchHeader matchId={matchId} />
                    <BettingTabs />
                </div>
            </div>

            {/* Right sidebar - fixed position, doesn't move */}
            <div className="w-full lg:w-80 xl:w-96 lg:fixed lg:right-4 lg:top-0 lg:h-screen lg:overflow-y-auto lg:pt-[160px]">
                <div className="p-2 sm:p-3 md:p-4 lg:p-2">
                    <MatchVisualization />
                </div>
            </div>
        </div>
    )
}

export default MatchDetailPage

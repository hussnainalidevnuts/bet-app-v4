import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "../ui/button"
import { useBetting } from "@/hooks/useBetting"


const BettingTabs = ({ matchData }) => {
    const [selectedTab, setSelectedTab] = useState("all")
    const scrollAreaRef = useRef(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)




    //INFO: Use the backend-provided betting data directly
    const bettingData = matchData?.betting_data || [];
    const categories = matchData?.odds_classification?.categories || [{ id: 'all', label: 'All', odds_count: 0 }];
    const hasData = bettingData.length > 0;

    // Helper function to get data by category
    const getDataByCategory = useCallback((categoryId) => {
        if (categoryId === 'all') {
            // For 'all', group by category for accordion display
            // Group betting data by category
            const groupedByCategory = {};
            bettingData.forEach(item => {
                const categoryId = item.category;
                if (!groupedByCategory[categoryId]) {
                    groupedByCategory[categoryId] = [];
                }
                groupedByCategory[categoryId].push(item);
            });
            // Map to the format expected by the component
            return categories
                .filter(tab => tab.id !== "all")
                .map(tab => ({
                    id: tab.id,
                    label: tab.label,
                    markets: groupedByCategory[tab.id] || [],
                    totalMarkets: (groupedByCategory[tab.id] || []).length
                }))
                .filter(group => group.markets.length > 0);
        }
        // For other tabs, just return the betting data for that category as a single market group
        return [
            {
                id: categoryId,
                label: categories.find(cat => cat.id === categoryId)?.label || categoryId,
                markets: bettingData.filter(item => item.category === categoryId),
                totalMarkets: bettingData.filter(item => item.category === categoryId).length
            }
        ];
    }, [bettingData, categories]);



    const tabs = useMemo(() => [
        { id: "all", label: "All" },
        ...categories.filter(cat => cat.id !== "all").map(cat => ({
            id: cat.id,
            label: cat.label
        }))
    ], [categories])

    // Check scroll state
    const checkScrollState = useCallback(() => {
        const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollElement) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollElement
            setCanScrollLeft(scrollLeft > 0)
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
        }
    }, [])

    //INFO: Scroll functions
    const scrollLeft = () => {
        const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollElement) {
            scrollElement.scrollBy({ left: -200, behavior: 'smooth' })
        }
    }

    const scrollRight = () => {
        const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollElement) {
            scrollElement.scrollBy({ left: 200, behavior: 'smooth' })
        }
    }
    // Listen for scroll events
    useEffect(() => {
        const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollElement) {
            scrollElement.addEventListener('scroll', checkScrollState)
            // Initial check with delay to ensure layout is ready
            const timer = setTimeout(checkScrollState, 100)

            return () => {
                scrollElement.removeEventListener('scroll', checkScrollState)
                clearTimeout(timer)
            }
        }
    }, [checkScrollState])    // Check scroll state on resize and when component mounts
    useEffect(() => {
        const handleResize = () => {
            setTimeout(checkScrollState, 100)
        }
        window.addEventListener('resize', handleResize)
        // Also check when component mounts or updates
        setTimeout(checkScrollState, 200)

        return () => window.removeEventListener('resize', handleResize)
    }, [checkScrollState])

    // Memoized filtered data for individual tabs
    const getTabData = useCallback((tab) => {
        return getDataByCategory(tab.id);
    }, [getDataByCategory]);


    return (


        <div className="mb-6  -mt-6">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full ">
                {/* Tab navigation with scroll buttons */}
                <div className="mb-4 sm:mb-6 bg-white pb-2 pl-2 sm:pl-[13px] p-1">
                    <div className="relative flex items-center">
                        {/* Left scroll button - Always visible */}

                        {
                            canScrollLeft && (
                                <button
                                    onClick={scrollLeft}
                                    className={`absolute left-0 z-10 flex hover:bg-gray-100 items-center justify-center w-8 h-8 bg-white transition-all duration-200  text-black cursor-pointer`}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            )
                        }

                        {/* Scrollable tabs area */}
                        <div className="overflow-hidden w-fit mx-8">
                            <ScrollArea
                                ref={scrollAreaRef}
                                orientation="horizontal"
                                className="w-full"
                            >
                                <div className="flex gap-1 sm:gap-1.5 min-w-max pr-4">
                                    {tabs.map((tab) => (
                                        <Button
                                            key={tab.id}
                                            onClick={() => setSelectedTab(tab.id)}
                                            className={`px-2 py-1.5 sm:px-3 sm:py-1 font-normal cursor-pointer text-xs rounded-2xl sm:rounded-3xl whitespace-nowrap transition-all duration-200 flex-shrink-0 ${selectedTab === tab.id
                                                ? "bg-base text-white "
                                                : "text-gray-600 hover:text-gray-900 bg-white  hover:bg-gray-100"
                                                }`}
                                        >
                                            {tab.label}
                                        </Button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Right scroll button - Always visible */}
                        {
                            canScrollRight && (
                                <button
                                    onClick={scrollRight}
                                    className={`absolute right-0 z-10 flex items-center justify-center w-8 h-8 bg-white  transition-all duration-200 hover:bg-gray-100 text-black cursor-pointer`}
                                    disabled={!canScrollRight}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )
                        }

                    </div>
                </div>
                {tabs.map((tab) => (
                    <TabsContent key={tab.id} value={tab.id} className="space-y-3">
                        <BettingMarketGroup
                            groupedMarkets={getTabData(tab)}
                            emptyMessage={`${tab.label} betting options will be displayed here`}
                            matchData={matchData}
                        />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}

const BettingMarketGroup = ({ groupedMarkets, emptyMessage, matchData }) => {
    if (!groupedMarkets || groupedMarkets.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                <div className="text-lg font-medium mb-2">No betting options available</div>
                <div className="text-sm">{emptyMessage || "Betting options will be displayed here"}</div>
            </div>
        )
    }
    const isAllTab = groupedMarkets.length > 1;
    // Helper for grid class
    const getGridClass = (options) => {
        const isThreeWayMarket = options.length === 3 &&
            (options.some(opt => opt.label.toLowerCase() === 'draw') ||
                options.every(opt => ['1x', 'x2', '12'].includes(opt.label.toLowerCase())));
        if (isThreeWayMarket) return "grid-cols-3";
        const optionsCount = options.length;
        if (optionsCount <= 2) return "grid-cols-2";
        else if (optionsCount <= 4) return "grid-cols-2 sm:grid-cols-4";
        else if (optionsCount <= 6) return "grid-cols-2 sm:grid-cols-3";
        else return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
    };
    // Render betting options
    const renderOptions = (options, section) => (
        <div className={`grid ${getGridClass(options)} gap-1`}>
            {options.map((option, idx) => (
                <BettingOptionButton
                    key={`${option.label}-${idx}`}
                    label={option.label}
                    value={option.value}
                    sectionType={section?.type || 'market'}
                    optionId={option?.id}
                    matchData={matchData}
                />
            ))}
        </div>
    );
    // Render market sections
    const renderSections = (category) => (
        category.markets.map((section) => (
            <div key={section.id} className="bg-white border overflow-hidden transition-all duration-200">
                <div className="px-4 py-2.5">
                    <h3 className="text-sm font-semibold text-gray-800">{section.title}</h3>
                </div>
                <div className="p-3">
                    {renderOptions(section.options, section)}
                </div>
            </div>
        ))
    );
    // All tab: use accordion
    if (isAllTab) {
        return (
            <Accordion type="multiple" className="space-y-2">
                {groupedMarkets.map((category) => (
                    <AccordionItem key={category.id} value={category.id} className="bg-white border border-gray-200 overflow-hidden duration-200">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50/50 transition-colors duration-200 [&[data-state=open]]:bg-gray-50/80">
                            <div className="flex items-center gap-3">
                                <h4 className="text-sm font-semibold text-gray-900">{category.label}</h4>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    {category.totalMarkets} markets
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-3 bg-gray-50/30">
                            <div className="space-y-3">
                                {renderSections(category)}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        );
    }
    // Category tab: expanded
    return (
        <div className="space-y-2">
            {groupedMarkets.map((category) => (
                <div key={category.id} className="bg-white border border-gray-200 overflow-hidden duration-200">
                    <div className="px-4 py-3 flex items-center gap-3 bg-gray-50/80">
                        <h4 className="text-sm font-semibold text-gray-900">{category.label}</h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            {category.totalMarkets} markets
                        </span>
                    </div>
                    <div className="space-y-3 px-4 py-3 bg-gray-50/30">
                        {renderSections(category)}
                    </div>
                </div>
            ))}
        </div>
    );
};

const BettingOptionButton = ({ label, value, sectionType, optionId, matchData }) => {
    const { createBetHandler } = useBetting();
    const transformedOBJ = {
        id: matchData.id,
        team1: matchData.participants[0].name,
        team2: matchData.participants[1].name,
        time: matchData.starting_at,

    }
    return (
        <Button
            className="group relative px-2 py-1 text-center transition-all duration-200 active:scale-[0.98] betting-button"
            onClick={createBetHandler(transformedOBJ, label, value, sectionType, optionId)}
        >
            <div className="relative w-full flex justify-between py-1 z-10">
                <div className="text-[12px] text-white font-medium mb-0.5 transition-colors duration-200 leading-tight">
                    {label}
                </div>
                <div className="text-[12px] font-bold text-white transition-colors duration-200">
                    {value}
                </div>
            </div>
        </Button>
    );
};

export default BettingTabs 

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
    fetchPopularLeagues,
    updateLeaguePopularity,
    selectPopularLeagues,
    selectPopularLeaguesLoading,
    selectUpdateLoading,
    selectUpdateError,
} from "@/lib/features/leagues/leaguesSlice";
import DraggableLeagueCard from "./DraggableLeagueCard";
import PopularLeaguesDropZone from "./PopularLeaguesDropZone";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { List, Search, Trophy, Save, GripHorizontal } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LeagueManagementPage() {
    const dispatch = useDispatch();
    const leagues = useSelector(selectPopularLeagues);
    const loading = useSelector(selectPopularLeaguesLoading);
    const updateLoading = useSelector(selectUpdateLoading);
    const updateError = useSelector(selectUpdateError);
    const router = useRouter();

    const [popularLeagues, setPopularLeagues] = useState([]);
    const [availableLeagues, setAvailableLeagues] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [popularSearchQuery, setPopularSearchQuery] = useState("");
    const [hasChanges, setHasChanges] = useState(false);
    const [originalPopularLeagues, setOriginalPopularLeagues] = useState([]);

    useEffect(() => {
        dispatch(fetchPopularLeagues());
    }, [dispatch]);

    useEffect(() => {
        if (leagues.length > 0) {
            // Categorize leagues based on isPopular attribute
            const popular = leagues.filter(league => league.isPopular === true);
            const available = leagues.filter(league => league.isPopular !== true);
            
            setPopularLeagues(popular);
            setAvailableLeagues(available);
            setOriginalPopularLeagues(popular);
            setHasChanges(false); // Reset changes when data is refreshed
        }
    }, [leagues]);

    // Handle update error
    useEffect(() => {
        if (updateError) {
            toast.error(updateError);
        }
    }, [updateError]);

    const handleDrop = (league) => {
        if (popularLeagues.length >= 10) {
            toast.warning("Maximum of 10 popular leagues reached.");
            return;
        }
        
        // Move league from available to popular
        setAvailableLeagues((prev) => prev.filter((l) => l.id !== league.id));
        setPopularLeagues((prev) => [...prev, { ...league, isPopular: true }]);
        setHasChanges(true);
    };

    const handleRemoveFromPopular = (league) => {
        // Move league from popular to available
        setPopularLeagues((prev) => prev.filter((l) => l.id !== league.id));
        setAvailableLeagues((prev) => [{ ...league, isPopular: false }, ...prev]);
        setHasChanges(true);
    };

    const reorderPopularLeagues = (dragIndex, hoverIndex) => {
        const draggedLeague = popularLeagues[dragIndex];
        const updatedLeagues = [...popularLeagues];
        updatedLeagues.splice(dragIndex, 1);
        updatedLeagues.splice(hoverIndex, 0, draggedLeague);
        setPopularLeagues(updatedLeagues);
        setHasChanges(true);
    };

    const handleSaveChanges = async () => {
        if (!hasChanges) {
            toast.info("No changes to save");
            return;
        }

        console.log("🔄 Starting handleSaveChanges...");
        console.log("📊 Current popular leagues:", popularLeagues);
        console.log("📊 Original popular leagues:", originalPopularLeagues);

        try {
            // Get all leagues that were originally popular but are no longer popular
            const removedFromPopular = originalPopularLeagues.filter(originalLeague => 
                !popularLeagues.some(currentLeague => currentLeague.id === originalLeague.id)
            );

            console.log("🗑️ Removed from popular:", removedFromPopular);

            // Prepare leagues data for backend
            const leaguesToUpdate = [
                // Update current popular leagues with their new order
                ...popularLeagues.map((league, index) => ({
                    leagueId: league.id,
                    name: league.name,
                    isPopular: true,
                    order: index
                })),
                // Update leagues that were removed from popular
                ...removedFromPopular.map(league => ({
                    leagueId: league.id,
                    name: league.name,
                    isPopular: false,
                    order: 0
                }))
            ];

            console.log("📤 Leagues to update:", leaguesToUpdate);

            // Always send update when there are changes
            console.log("🚀 Dispatching updateLeaguePopularity...");
            const result = await dispatch(updateLeaguePopularity(leaguesToUpdate)).unwrap();
            
            console.log("✅ Update result:", result);
            
            if (result.success) {
                // Refresh leagues to get updated data
                console.log("🔄 Refreshing leagues data...");
                await dispatch(fetchPopularLeagues());
                console.log("✅ Leagues refreshed, setting hasChanges to false");
                toast.success('Popular leagues updated successfully');
                setHasChanges(false);
            }
        } catch (error) {
            console.error('❌ Error updating popular leagues:', error);
            toast.error('Failed to update popular leagues');
        }
    };

    const filteredAvailableLeagues = useMemo(() => {
        if (!searchQuery) return availableLeagues;
        const query = searchQuery.toLowerCase().trim();
        return availableLeagues.filter((league) => {
            const leagueName = league.name?.toLowerCase() || "";
            const countryName = league.country?.official_name?.toLowerCase() || league.country?.name?.toLowerCase() || "";
            const shortCode = league.short_code?.toLowerCase() || "";
            
            return leagueName.includes(query) || 
                   countryName.includes(query) || 
                   shortCode.includes(query);
        });
    }, [searchQuery, availableLeagues]);

    const filteredPopularLeagues = useMemo(() => {
        if (!popularSearchQuery) return popularLeagues;
        const query = popularSearchQuery.toLowerCase().trim();
        return popularLeagues.filter((league) => {
            const leagueName = league.name?.toLowerCase() || "";
            const countryName = league.country?.official_name?.toLowerCase() || league.country?.name?.toLowerCase() || "";
            const shortCode = league.short_code?.toLowerCase() || "";
            
            return leagueName.includes(query) || 
                   countryName.includes(query) || 
                   shortCode.includes(query);
        });
    }, [popularSearchQuery, popularLeagues]);

    const groupedAvailableLeagues = useMemo(() => {
        if (!filteredAvailableLeagues.length) return [];

        const grouped = filteredAvailableLeagues.reduce((acc, league) => {
            const countryName = league.country?.official_name || league.country?.name || "Other";
            if (!acc[countryName]) {
                acc[countryName] = {
                    countryImage: league.country?.image,
                    leagues: []
                };
            }
            acc[countryName].leagues.push(league);
            return acc;
        }, {});

        // Convert to array and sort by country name
        return Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([country, data]) => ({
                country,
                countryImage: data.countryImage,
                leagues: data.leagues
            }));
    }, [filteredAvailableLeagues]);

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Loading leagues...</p>
                </div>
            </div>
        );
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="space-y-8 w-[95%] mx-auto">
                <div className="flex items-center justify-between py-2">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight mt-2">League Management</h1>
                        <p className="text-muted-foreground mt-1">Organize and prioritize leagues for your users.</p>
                    </div>
                    <Button
                        onClick={handleSaveChanges}
                        disabled={!hasChanges || updateLoading}
                        className={`${hasChanges ? "" : "hidden"} px-3 py-3`}
                    >
                        {updateLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        {updateLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 -mt-3">
                    <Card className="rounded-none">
                        <CardHeader>
                            <CardTitle className="flex items-center text-lg">
                                <List className="mr-2 h-5 w-5" />
                                Available Leagues ({filteredAvailableLeagues.length})
                            </CardTitle>
                            <CardDescription>
                                Drag leagues to the popular section to feature them
                            </CardDescription>
                            <div className="mt-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by league or country name..."
                                        className="pl-10"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[450px]">
                                <div className="space-y-6 pr-4">
                                    {groupedAvailableLeagues.map((group) => (
                                        <div key={group.country} className="space-y-3">
                                            <div className="flex items-center gap-2 sticky top-0 bg-background py-2">
                                                {group.countryImage && (
                                                    <img
                                                        src={group.countryImage}
                                                        alt={group.country}
                                                        className="w-6 h-6 object-contain rounded-sm"
                                                        onError={(e) => {
                                                            e.target.style.display = "none";
                                                        }}
                                                    />
                                                )}
                                                <h3 className="font-medium text-sm text-muted-foreground">
                                                    {group.country}
                                                </h3>
                                                <div className="h-[1px] flex-1 bg-border/50 ml-2"></div>
                                            </div>
                                            {group.leagues.map((league) => (
                                                <DraggableLeagueCard
                                                    key={league.id}
                                                    league={league}
                                                    type="available"
                                                />
                                            ))}
                                        </div>
                                    ))}
                                    {filteredAvailableLeagues.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                            <List className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                            <p className="text-muted-foreground font-medium">
                                                {searchQuery
                                                    ? "No leagues match your search"
                                                    : "All leagues are in the popular section"}
                                            </p>
                                            <p className="text-sm text-muted-foreground/75 mt-1">
                                                {searchQuery && "Try adjusting your search terms"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card className="border-dashed rounded-none">
                        <CardHeader>
                            <CardTitle className="flex items-center text-lg">
                                <Trophy className="mr-2 h-5 w-5 text-amber-500" />
                                Popular Leagues ({filteredPopularLeagues.length}/10)
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                <GripHorizontal className="h-4 w-4 text-muted-foreground" />
                                Drag to reorder or remove leagues
                            </CardDescription>
                            <div className="mt-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search popular leagues..."
                                        className="pl-10"
                                        value={popularSearchQuery}
                                        onChange={(e) => setPopularSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[450px] pr-4">
                                <PopularLeaguesDropZone
                                    leagues={filteredPopularLeagues}
                                    onDrop={handleDrop}
                                    onReorder={reorderPopularLeagues}
                                    onRemove={handleRemoveFromPopular}
                                />
                                {filteredPopularLeagues.length === 0 && popularLeagues.length > 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <Trophy className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                        <p className="text-muted-foreground font-medium">
                                            No popular leagues match your search
                                        </p>
                                        <p className="text-sm text-muted-foreground/75 mt-1">
                                            Try adjusting your search terms
                                        </p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DndProvider>
    );
}

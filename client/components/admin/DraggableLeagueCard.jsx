"use client";

import React from "react";
import { useDrag } from "react-dnd";
import { Card, CardContent } from "@/components/ui/card";

const DraggableLeagueCard = ({ league, type, index, onRemove }) => {
    const [{ isDragging }, drag] = useDrag({
        type: type === "popular" ? "POPULAR_LEAGUE" : "AVAILABLE_LEAGUE",
        item: { league, index, type },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    return (
        <div
            ref={drag}
            className={`cursor-move transition-all duration-200 opacity-100 scale-100"
                }`}
        >
            <Card className="bg-base-light/10 rounded-none hover:bg-base-light/20 border-base-light/30">
                <CardContent className="py-0 px-4 " >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {league.image_path && (
                                <img
                                    src={league.image_path}
                                    alt={league.name}
                                    className="w-8 h-8 object-contain"
                                    onError={(e) => {
                                        e.target.style.display = "none";
                                    }}
                                />
                            )}
                            <div>
                                <h3 className="font-medium text-card-foreground">
                                    {league.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {league.country?.name || "International"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            {type === "popular" && typeof index === "number" && (
                                <span className="bg-base text-white text-xs px-2 py-1 rounded-full">
                                    #{index + 1}
                                </span>
                            )}

                            {type === "popular" && onRemove && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(league);
                                    }}
                                    className="text-destructive hover:text-destructive/80 text-sm px-2 py-1 rounded"
                                    title="Remove from popular"
                                >
                                    ✕
                                </button>
                            )}

                            <div className="text-muted-foreground text-xs">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DraggableLeagueCard;

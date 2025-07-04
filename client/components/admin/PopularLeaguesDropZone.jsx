"use client";

import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import DraggableLeagueCard from "./DraggableLeagueCard";

const PopularLeaguesDropZone = ({ leagues, onDrop, onReorder, onRemove }) => {
    const ref = useRef(null);

    const [{ isOver, canDrop }, drop] = useDrop({
        accept: ["AVAILABLE_LEAGUE", "POPULAR_LEAGUE"],
        drop: (item) => {
            if (item.type === "available") {
                onDrop(item.league);
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    const moveCard = (dragIndex, hoverIndex) => {
        onReorder(dragIndex, hoverIndex);
    };

    drop(ref);

    return (
        <div
            ref={ref}
            className={`min-h-64 rounded-lg border-2 border-dashed transition-colors duration-200 p-4 ${isOver && canDrop
                ? "border-base bg-base-light/10"
                : "border-border bg-muted/5"
                }`}
        >
            {leagues.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-center">
                    <div className="text-muted-foreground">
                        <div className="text-3xl mb-2">📋</div>
                        <p>Drop leagues here to make them popular</p>
                        <p className="text-sm mt-1">You can add up to 10 popular leagues</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {leagues.map((league, index) => (
                        <DraggablePopularLeagueCard
                            key={league.id}
                            league={league}
                            index={index}
                            moveCard={moveCard}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Separate component for popular leagues with reordering capability
const DraggablePopularLeagueCard = ({ league, index, moveCard, onRemove }) => {
    const ref = useRef(null);

    const [{ isDragging }, drag] = useDrag({
        type: "POPULAR_LEAGUE",
        item: { league, index, type: "popular" },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: "POPULAR_LEAGUE",
        hover: (item) => {
            if (!ref.current) return;

            const dragIndex = item.index;
            const hoverIndex = index;

            if (dragIndex === hoverIndex) return;

            moveCard(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    drag(drop(ref));

    return (
        <div
            ref={ref}
            className={`transition-all duration-200 ${isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100"
                }`}
        >
            <DraggableLeagueCard
                league={league}
                type="popular"
                index={index}
                onRemove={onRemove}
            />
        </div>
    );
};

export default PopularLeaguesDropZone;

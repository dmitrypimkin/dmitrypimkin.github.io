
import React, { useState, useRef, useEffect } from 'react';
import type { TimelineEvent } from '../types';
import { SUBJECT_COLORS } from '../constants';


interface InteractiveTimelineProps {
    events: TimelineEvent[];
    duration: number; // in seconds
    onEventUpdate: (updatedEvent: TimelineEvent) => void;
    onEventRemove: (eventId: string) => void;
}

const InteractiveTimeline: React.FC<InteractiveTimelineProps> = ({ events, duration, onEventUpdate, onEventRemove }) => {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [draggingEvent, setDraggingEvent] = useState<{id: string, startOffset: number} | null>(null);

    const paramColorMap = useRef(new Map<string, string>());

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!draggingEvent || !timelineRef.current) return;
            
            const timelineRect = timelineRef.current.getBoundingClientRect();
            const mouseX = e.clientX - timelineRect.left;
            const percent = Math.max(0, Math.min(1, mouseX / timelineRect.width));
            
            const currentEvent = events.find(ev => ev.id === draggingEvent.id);
            if (!currentEvent) return;
            
            const eventDuration = currentEvent.end - currentEvent.start;
            const newStart = Math.round((percent * duration) - draggingEvent.startOffset);
            
            const clampedStart = Math.max(0, Math.min(newStart, duration - eventDuration));
            const newEnd = clampedStart + eventDuration;

            if (clampedStart !== currentEvent.start) {
                onEventUpdate({ ...currentEvent, start: clampedStart, end: newEnd });
            }
        };

        const handleMouseUp = () => {
            setDraggingEvent(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingEvent, duration, onEventUpdate, events]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, event: TimelineEvent) => {
        if (!timelineRef.current) return;
        const eventRect = e.currentTarget.getBoundingClientRect();
        const timelineRect = timelineRef.current.getBoundingClientRect();
        const mouseX = e.clientX - eventRect.left;
        const startOffset = (mouseX / eventRect.width) * (event.end - event.start);
        setDraggingEvent({ id: event.id, startOffset });
    };

    const calculateLayout = (allEvents: TimelineEvent[]) => {
        const sortedEvents = [...allEvents].sort((a, b) => a.start - b.start);
        const layout: (TimelineEvent & { lane: number })[] = [];
        const lanes: number[] = []; 

        for (const event of sortedEvents) {
            let placed = false;
            for (let i = 0; i < lanes.length; i++) {
                if (lanes[i] <= event.start) {
                    lanes[i] = event.end;
                    layout.push({ ...event, lane: i });
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                lanes.push(event.end);
                layout.push({ ...event, lane: lanes.length - 1 });
            }
        }
        return { layout, totalLanes: lanes.length };
    };

    const { layout, totalLanes } = calculateLayout(events);
    
    // Assign a consistent color per parameter path
    events.forEach((event) => {
        if (!paramColorMap.current.has(event.paramPath)) {
            const colorIndex = paramColorMap.current.size % SUBJECT_COLORS.length;
            paramColorMap.current.set(event.paramPath, SUBJECT_COLORS[colorIndex]);
        }
    });

    return (
        <div className="mt-4">
            <label className="font-medium text-gray-300">Interactive Timeline</label>
            <div ref={timelineRef} className="relative w-full h-auto min-h-[80px] bg-gray-800 rounded-lg p-2 mt-2 overflow-x-auto select-none" style={{ height: `${Math.max(3, totalLanes) * 2.5 + 2}rem` }}>
                {Array.from({ length: duration + 1 }).map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-l border-gray-700/50" style={{ left: `${(i / duration) * 100}%` }}>
                       { i > 0 && i % 2 === 0 && <span className="absolute -top-5 text-xs text-gray-500 transform -translate-x-1/2">{i}s</span>}
                    </div>
                ))}

                {layout.map((event) => {
                    const left = (event.start / duration) * 100;
                    const width = (Math.max(0.1, event.end - event.start) / duration) * 100;
                    const top = event.lane * 2.5; 
                    return (
                        <div
                            key={event.id}
                            onMouseDown={(e) => handleMouseDown(e, event)}
                            className="absolute h-8 rounded flex items-center justify-start px-2 text-xs text-white whitespace-nowrap overflow-hidden text-ellipsis cursor-grab group"
                            style={{
                                left: `${left}%`,
                                width: `${width}%`,
                                top: `${top}rem`,
                                backgroundColor: paramColorMap.current.get(event.paramPath) || '#777',
                                zIndex: draggingEvent?.id === event.id ? 10 : 1,
                            }}
                            title={`${event.paramName}: ${event.value} (${event.start}s-${event.end}s)`}
                        >
                            <span className="font-bold mr-2">{event.paramName}</span>
                            <span>{event.value}</span>
                             <button
                                onClick={(e) => {e.stopPropagation(); onEventRemove(event.id);}}
                                className="absolute top-1/2 right-1 -translate-y-1/2 w-4 h-4 bg-black/30 rounded-full text-white text-xs leading-none z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                &times;
                             </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default InteractiveTimeline;

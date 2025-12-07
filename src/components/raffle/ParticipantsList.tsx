'use client';

import { useState } from 'react';
import { useParticipants } from '@/context/ParticipantsContext';
import { ChevronLeft, ChevronRight, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ParticipantsList() {
    const { allParticipants, availableParticipants } = useParticipants();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          fixed right-0 top-1/2 -translate-y-1/2 z-30
          bg-card/90 backdrop-blur-sm border border-border/50 
          rounded-l-lg px-2 py-4 shadow-lg
          transition-all duration-300
          hover:bg-card
          ${isOpen ? 'translate-x-[280px]' : 'translate-x-0'}
        `}
                title={isOpen ? 'Hide Participants' : 'Show Participants'}
            >
                <div className="flex flex-col items-center gap-2">
                    {isOpen ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-bold text-primary writing-mode-vertical">
                        {allParticipants.length}
                    </span>
                </div>
            </button>

            {/* Slide-out Panel */}
            <div
                className={`
          fixed right-0 top-0 h-full w-[280px] z-20
          bg-card/95 backdrop-blur-md border-l border-border/50
          shadow-2xl
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-card-foreground flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Participants
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {availableParticipants.length} available / {allParticipants.length} total
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto p-2">
                        {allParticipants.length === 0 ? (
                            <div className="text-center text-muted-foreground text-sm p-4">
                                No participants yet
                            </div>
                        ) : (
                            <ul className="space-y-1">
                                {allParticipants.map((participant, index) => {
                                    const isAvailable = availableParticipants.some(p => p.id === participant.id);
                                    return (
                                        <li
                                            key={participant.id}
                                            className={`
                        text-sm px-3 py-2 rounded-md
                        transition-colors
                        ${isAvailable
                                                    ? 'bg-primary/10 text-card-foreground'
                                                    : 'bg-muted/30 text-muted-foreground line-through opacity-50'
                                                }
                      `}
                                        >
                                            <span className="text-xs text-muted-foreground mr-2">
                                                {index + 1}.
                                            </span>
                                            {participant.display_name}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

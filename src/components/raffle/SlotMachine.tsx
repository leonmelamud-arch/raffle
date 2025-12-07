
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Participant } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

interface SlotMachineProps {
  participants: Participant[];
  winner: Participant | null;
  isSpinning: boolean;
  onSpinEnd: () => void;
  loading: boolean;
}

const REPETITIONS = 10;
const ITEM_HEIGHT_REM = 5; // h-20
const ITEM_HEIGHT_PX = ITEM_HEIGHT_REM * 16; // 80px

export function SlotMachine({ participants, winner, isSpinning, onSpinEnd, loading }: SlotMachineProps) {
  const [shuffledParticipants, setShuffledParticipants] = useState<Participant[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  const participantList = useMemo(() => {
    if (participants.length === 0) return [];
    // Use a stable shuffle based on participants array to avoid re-shuffling on every render
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    return Array.from({ length: REPETITIONS }, () => shuffled).flat();
  }, [participants]);

  useEffect(() => {
    if (participants.length > 0) {
        setShuffledParticipants(participantList);
    }
  }, [participants, participantList]);
  
  useEffect(() => {
    if (isSpinning && winner && shuffledParticipants.length > 0) {
      // Find a winner instance in the latter half for a good spin
      const winnerIndex = shuffledParticipants.findIndex(
        (p, index) => p.id === winner.id && index >= shuffledParticipants.length / 2
      );
      
      if (winnerIndex !== -1) {
        const list = listRef.current;
        if (!list) return;

        // Reset to initial state without animation
        list.style.transition = 'none';
        list.style.transform = 'translateY(0px)';

        // Force a reflow
        void list.offsetHeight;
        
        // Center the winner in the view. The container is 3 items high, so we want the winner at the 2nd position.
        const targetPosition = -winnerIndex * ITEM_HEIGHT_PX + ITEM_HEIGHT_PX;
        
        // Set animation styles and trigger it
        list.style.transition = 'transform 8s cubic-bezier(0.25, 0.1, 0.25, 1)';
        list.style.transform = `translateY(${targetPosition}px)`;
        
        setIsAnimating(true);
      }
    }
  }, [isSpinning, winner, shuffledParticipants]);

  const handleTransitionEnd = () => {
    if (isAnimating) {
      setIsAnimating(false);
      onSpinEnd();
    }
  };

  const hasParticipants = shuffledParticipants.length > 0;

  if (loading) {
    return (
        <div className="relative h-[15rem] w-full max-w-lg overflow-hidden bg-card/80 backdrop-blur-sm rounded-2xl shadow-2xl flex items-center justify-center">
            <Skeleton className="h-20 w-[90%] rounded-lg" />
        </div>
    );
  }

  return (
    <div className="relative h-[15rem] w-full max-w-lg overflow-hidden bg-card/80 backdrop-blur-sm rounded-2xl shadow-2xl">
      <div 
        className="absolute top-1/2 left-0 right-0 h-[5rem] -translate-y-1/2 rounded-lg border-2 border-primary/80 shadow-[0_0_20px_3px_var(--tw-shadow-color)] shadow-primary/70 z-20 pointer-events-none" 
        aria-hidden="true" 
      />
      <div 
        className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-card/90 via-card/70 to-transparent z-10 pointer-events-none" 
        aria-hidden="true" 
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-card/90 via-card/70 to-transparent z-10 pointer-events-none" 
        aria-hidden="true" 
      />

      <ul
        ref={listRef}
        onTransitionEnd={handleTransitionEnd}
        className="h-full"
      >
        {hasParticipants ? (
          shuffledParticipants.map((p, i) => (
            <li
              key={`${p.id}-${i}`}
              className="h-20 flex items-center justify-center text-4xl font-bold text-card-foreground/70"
              aria-hidden={!isSpinning && winner?.id === p.id ? "false" : "true"}
            >
              {p.displayName}
            </li>
          ))
        ) : (
          <li className="h-full flex items-center justify-center text-black text-xl">
            Add participants to begin
          </li>
        )}
      </ul>
    </div>
  );
}


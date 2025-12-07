"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Participant } from '@/types';
import { cn } from '@/lib/utils';

interface SlotMachineProps {
  participants: Participant[];
  winner: Participant | null;
  isSpinning: boolean;
  onSpinEnd: () => void;
}

const REPETITIONS = 10;
const ITEM_HEIGHT_REM = 5; // h-20
const ITEM_HEIGHT_PX = ITEM_HEIGHT_REM * 16; // 80px

export function SlotMachine({ participants, winner, isSpinning, onSpinEnd }: SlotMachineProps) {
  const [shuffledParticipants, setShuffledParticipants] = useState<Participant[]>([]);
  const [animationTarget, setAnimationTarget] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const participantList = useMemo(() => {
    if (participants.length === 0) return [];
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    return Array.from({ length: REPETITIONS }, () => shuffled).flat();
  }, [participants]);

  useEffect(() => {
    if(participants.length > 0 && shuffledParticipants.length === 0) {
      setShuffledParticipants(participantList);
    }
  }, [participants, participantList, shuffledParticipants]);

  useEffect(() => {
    if (isSpinning && winner && shuffledParticipants.length > 0) {
      // Find a winner instance in the latter half for a good spin
      const winnerIndex = shuffledParticipants.findIndex(
        (p, index) => p.id === winner.id && index >= shuffledParticipants.length / 2
      );

      if (winnerIndex !== -1) {
        // Center the winner in the view. The container is 3 items high, so we want the winner at the 2nd position.
        const targetPosition = -winnerIndex * ITEM_HEIGHT_PX + ITEM_HEIGHT_PX;
        setAnimationTarget(targetPosition);
        setIsAnimating(true);
      }
    }
  }, [isSpinning, winner, shuffledParticipants]);

  const handleTransitionEnd = () => {
    if (isAnimating) {
      setIsAnimating(false);
      onSpinEnd();

      // "Snap" to a new state to prepare for next spin without animation
      if (winner && listRef.current) {
        const winnerIndex = shuffledParticipants.findIndex(p => p.id === winner.id);
        if (winnerIndex === -1) return;
        
        listRef.current.style.transition = 'none';

        const newShuffled = [winner, ...shuffledParticipants.filter((_, i) => i !== winnerIndex)];
        setShuffledParticipants(newShuffled);

        const newTarget = -newShuffled.findIndex(p => p.id === winner.id) * ITEM_HEIGHT_PX + ITEM_HEIGHT_PX;
        setAnimationTarget(newTarget);
        
        // Restore transition after a frame
        setTimeout(() => {
            if (listRef.current) {
                listRef.current.style.transition = '';
            }
        }, 50);
      }
    }
  };

  const hasParticipants = shuffledParticipants.length > 0;

  return (
    <div className="relative h-[15rem] w-full max-w-lg overflow-hidden bg-background/30 rounded-2xl shadow-2xl">
      <div 
        className="absolute top-1/2 left-0 right-0 h-[5rem] -translate-y-1/2 rounded-lg border-2 border-accent/80 shadow-[0_0_20px_3px_var(--tw-shadow-color)] shadow-accent/70 z-20 pointer-events-none" 
        aria-hidden="true" 
      />
      <div 
        className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-background/80 via-background/60 to-transparent z-10 pointer-events-none" 
        aria-hidden="true" 
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background/80 via-background/60 to-transparent z-10 pointer-events-none" 
        aria-hidden="true" 
      />

      <div
        ref={listRef}
        className={cn(isAnimating && "duration-[8000ms]")}
        style={{
          transform: `translateY(${animationTarget}px)`,
          transitionProperty: 'transform',
          transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)'
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {hasParticipants ? (
          shuffledParticipants.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              className="h-20 flex items-center justify-center text-4xl font-bold text-primary-foreground/70"
              aria-hidden={!isSpinning && winner?.id === p.id ? "false" : "true"}
            >
              {p.displayName}
            </div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center text-primary-foreground/50 text-xl">
            Add participants to begin
          </div>
        )}
      </div>
    </div>
  );
}

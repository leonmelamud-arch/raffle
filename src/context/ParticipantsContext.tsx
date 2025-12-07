'use client';

import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useEffect } from 'react';
import type { Participant } from '@/types';
import { useParticipants as useParticipantsHook } from '@/hooks/use-participants';
import { useSessionContext } from './SessionContext';

interface ParticipantsContextType {
  allParticipants: Participant[];
  setAllParticipants: Dispatch<SetStateAction<Participant[]>>;
  availableParticipants: Participant[];
  setAvailableParticipants: Dispatch<SetStateAction<Participant[]>>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const ParticipantsContext = createContext<ParticipantsContextType | undefined>(undefined);

export function ParticipantsProvider({ children }: { children: ReactNode }) {
  const { sessionId, loading: sessionLoading } = useSessionContext();
  const { participants, loading: participantsLoading, error, refetch } = useParticipantsHook(sessionId);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);

  const loading = sessionLoading || participantsLoading;

  useEffect(() => {
    if (participants) {
      // Sort participants once when they are loaded/updated
      const sortedParticipants = [...participants].sort((a, b) => a.display_name.localeCompare(b.display_name));

      setAllParticipants(prevAll => {
        // Simple way to check if it's the initial load
        if (prevAll.length === 0 && sortedParticipants.length > 0) {
          setAvailableParticipants(sortedParticipants);
        } else {
          // If not initial load, try to preserve the available list
          const updatedAvailable = sortedParticipants.filter(p =>
            availableParticipants.some(ap => ap.id === p.id)
          );
          if (updatedAvailable.length > 0) {
            setAvailableParticipants(updatedAvailable);
          } else {
            setAvailableParticipants(sortedParticipants);
          }
        }
        return sortedParticipants;
      });
    }
  }, [participants]);

  // Reset participants when session changes
  useEffect(() => {
    setAllParticipants([]);
    setAvailableParticipants([]);
  }, [sessionId]);

  const value = {
    allParticipants,
    setAllParticipants,
    availableParticipants,
    setAvailableParticipants,
    loading,
    error,
    refetch,
  };

  return (
    <ParticipantsContext.Provider value={value}>
      {children}
    </ParticipantsContext.Provider>
  );
}

export function useParticipants() {
  const context = useContext(ParticipantsContext);
  if (context === undefined) {
    throw new Error('useParticipants must be used within a ParticipantsProvider');
  }
  return context;
}


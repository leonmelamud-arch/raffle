"use client";

import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useEffect } from 'react';
import type { Participant } from '@/types';
import { useCollection } from '@/firebase/firestore/use-collection';

interface ParticipantsContextType {
  allParticipants: Participant[];
  setAllParticipants: Dispatch<SetStateAction<Participant[]>>;
  availableParticipants: Participant[];
  setAvailableParticipants: Dispatch<SetStateAction<Participant[]>>;
  loading: boolean;
}

const ParticipantsContext = createContext<ParticipantsContextType | undefined>(undefined);

export function ParticipantsProvider({ children }: { children: ReactNode }) {
  const { data: firestoreParticipants, loading } = useCollection<Participant>('participants');
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  
  useEffect(() => {
    if (firestoreParticipants) {
      // Find which participants are new
      const newParticipants = firestoreParticipants.filter(fp => !allParticipants.some(ap => ap.id === fp.id));
      
      if (newParticipants.length > 0) {
        setAllParticipants(prev => [...prev, ...newParticipants]);
        
        // Add new participants to available list, but don't re-add existing ones
        const currentAvailableIds = new Set(availableParticipants.map(p => p.id));
        const newlyAvailable = newParticipants.filter(p => !currentAvailableIds.has(p.id));
        if (newlyAvailable.length > 0) {
          setAvailableParticipants(prev => [...prev, ...newlyAvailable]);
        }
      }
    }
  }, [firestoreParticipants, allParticipants, availableParticipants]);


  return (
    <ParticipantsContext.Provider value={{ allParticipants, setAllParticipants, availableParticipants, setAvailableParticipants, loading }}>
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

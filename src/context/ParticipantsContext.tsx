"use client";

import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useEffect } from 'react';
import type { Participant } from '@/types';
import { useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface ParticipantsContextType {
  allParticipants: Participant[];
  setAllParticipants: Dispatch<SetStateAction<Participant[]>>;
  availableParticipants: Participant[];
  setAvailableParticipants: Dispatch<SetStateAction<Participant[]>>;
  loading: boolean;
}

const ParticipantsContext = createContext<ParticipantsContextType | undefined>(undefined);

export function ParticipantsProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const participantsCollection = firestore ? collection(firestore, 'participants') : null;
  const { data: firestoreParticipants, loading } = useCollection<Participant>(participantsCollection);

  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  
  useEffect(() => {
    if (firestoreParticipants) {
        setAllParticipants(firestoreParticipants);
        // This logic ensures that newly added participants are available for the raffle
        // without resetting the 'available' list during a winner selection process.
        const currentIds = new Set(allParticipants.map(p => p.id));
        const newParticipants = firestoreParticipants.filter(p => !currentIds.has(p.id));
        
        if (newParticipants.length > 0) {
            setAvailableParticipants(prev => [...prev, ...newParticipants]);
        }
    }
  }, [firestoreParticipants]);

  // Effect to reset available participants when all participants are drawn
  useEffect(() => {
    if(availableParticipants.length === 0 && allParticipants.length > 0) {
        setAvailableParticipants(allParticipants);
    }
  }, [availableParticipants, allParticipants]);


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

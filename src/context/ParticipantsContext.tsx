"use client";

import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useEffect, useMemo } from 'react';
import type { Participant } from '@/types';
import { useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
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

  const participantsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'participants'));
  }, [firestore]);

  const { data: firestoreParticipants, loading } = useCollection<Participant>(participantsQuery);

  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  
  useEffect(() => {
    if (firestoreParticipants) {
        const sortedParticipants = [...firestoreParticipants].sort((a, b) => a.displayName.localeCompare(b.displayName));
        setAllParticipants(sortedParticipants);
        // Only set available participants if they are empty
        if (availableParticipants.length === 0) {
          setAvailableParticipants(sortedParticipants);
        }
    }
  }, [firestoreParticipants]);

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

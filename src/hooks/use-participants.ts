'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Participant } from '@/types';
import { db } from '@/lib/postgrest';

// Polling interval in milliseconds (3 seconds)
const POLLING_INTERVAL = 3000;

export function useParticipants(sessionId: string | null) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchParticipants = useCallback(async () => {
    if (!sessionId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await db
      .from<Participant>('participants')
      .select('*')
      .eq('session_id', sessionId);

    if (fetchError) {
      console.error('Error fetching participants:', fetchError);
      setError(fetchError);
    } else if (data) {
      setParticipants(data as Participant[]);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    setLoading(true);
    fetchParticipants();

    // Set up polling to replace real-time subscriptions
    pollingRef.current = setInterval(() => {
      fetchParticipants();
    }, POLLING_INTERVAL);

    // Cleanup polling on unmount or session change
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [sessionId, fetchParticipants]);

  return { participants, loading, error, refetch: fetchParticipants };
}


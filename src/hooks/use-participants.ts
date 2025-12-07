'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Participant } from '@/types';
import { supabase } from '@/lib/supabase';

export function useParticipants(sessionId: string | null) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchParticipants = useCallback(async () => {
    if (!sessionId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error fetching participants:', error);
      setError(error as any);
    } else {
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

    fetchParticipants();

    // Subscribe to changes for this specific session
    const channel = supabase
      .channel(`participants-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          // Refetch to keep in sync
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, fetchParticipants]);

  return { participants, loading, error, refetch: fetchParticipants };
}


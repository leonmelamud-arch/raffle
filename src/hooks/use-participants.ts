'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/supabase';
import type { Participant } from '../types';

interface UseParticipantsOptions {
  sessionId: string | null;
  pollingInterval?: number; // in milliseconds, default 2000
}

interface UseParticipantsReturn {
  participants: Participant[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addParticipant: (participant: Omit<Participant, 'id' | 'won'>) => Promise<{ data: Participant | null; error: Error | null }>;
  removeParticipant: (id: string) => Promise<{ error: Error | null }>;
  markAsWinner: (id: string) => Promise<{ error: Error | null }>;
  clearWinners: () => Promise<{ error: Error | null }>;
}

export function useParticipants({ 
  sessionId, 
  pollingInterval = 2000 
}: UseParticipantsOptions): UseParticipantsReturn {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch participants from database
  const fetchParticipants = useCallback(async () => {
    if (!sessionId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await db
        .from<Participant>('participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Only update state if data actually changed (compare by stringified value)
      setParticipants(prev => {
        const newData = data || [];
        if (JSON.stringify(prev) === JSON.stringify(newData)) {
          return prev; // Return same reference to prevent re-render
        }
        return newData;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch participants'));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Reset participants immediately when session changes
  useEffect(() => {
    setParticipants([]);
    setLoading(true);
  }, [sessionId]);

  // Initial fetch and polling
  useEffect(() => {
    fetchParticipants();

    // Set up polling for real-time-like updates
    const interval = setInterval(fetchParticipants, pollingInterval);

    return () => {
      clearInterval(interval);
    };
  }, [fetchParticipants, pollingInterval]);

  // Add a new participant
  const addParticipant = useCallback(async (
    participant: Omit<Participant, 'id' | 'won'>
  ): Promise<{ data: Participant | null; error: Error | null }> => {
    if (!sessionId) {
      return { data: null, error: new Error('No session ID') };
    }

    try {
      const { data, error: insertError } = await db
        .from<Participant>('participants')
        .insert({
          ...participant,
          session_id: sessionId,
          won: false,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Optimistically update local state
      if (data) {
        setParticipants(prev => [...prev, data as Participant]);
      }

      return { data: data as Participant, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add participant');
      return { data: null, error };
    }
  }, [sessionId]);

  // Remove a participant
  const removeParticipant = useCallback(async (id: string): Promise<{ error: Error | null }> => {
    try {
      const { error: deleteError } = await db
        .from('participants')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Optimistically update local state
      setParticipants(prev => prev.filter(p => p.id !== id));

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove participant');
      return { error };
    }
  }, []);

  // Mark a participant as winner
  const markAsWinner = useCallback(async (id: string): Promise<{ error: Error | null }> => {
    try {
      const { error: updateError } = await db
        .from('participants')
        .update({ won: true })
        .eq('id', id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Optimistically update local state
      setParticipants(prev => 
        prev.map(p => p.id === id ? { ...p, won: true } : p)
      );

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark winner');
      return { error };
    }
  }, []);

  // Clear all winners (reset won status)
  const clearWinners = useCallback(async (): Promise<{ error: Error | null }> => {
    if (!sessionId) {
      return { error: new Error('No session ID') };
    }

    try {
      const { error: updateError } = await db
        .from('participants')
        .update({ won: false })
        .eq('session_id', sessionId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Optimistically update local state
      setParticipants(prev => prev.map(p => ({ ...p, won: false })));

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear winners');
      return { error };
    }
  }, [sessionId]);

  return {
    participants,
    loading,
    error,
    refetch: fetchParticipants,
    addParticipant,
    removeParticipant,
    markAsWinner,
    clearWinners,
  };
}


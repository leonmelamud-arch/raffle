'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@/types';
import { supabase } from '@/lib/supabase';

// Generate a short, human-readable session ID
function generateShortId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0, O, I, 1
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function useSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Check localStorage for existing session ID on mount
    useEffect(() => {
        const initSession = async () => {
            setLoading(true);
            const storedSessionId = localStorage.getItem('hypnoraffle_session_id');

            if (storedSessionId) {
                // Try to fetch the existing session
                const { data, error } = await supabase
                    .from('sessions')
                    .select('*')
                    .eq('id', storedSessionId)
                    .single();

                if (data && !error) {
                    setSession(data as Session);
                    setLoading(false);
                    return;
                }
                // If session doesn't exist anymore, clear localStorage
                localStorage.removeItem('hypnoraffle_session_id');
            }

            // Create a new session
            await createNewSession();
        };

        initSession();
    }, []);

    const createNewSession = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from('sessions')
                .insert({ is_active: true })
                .select()
                .single();

            if (error) throw error;

            const newSession = data as Session;
            setSession(newSession);
            localStorage.setItem('hypnoraffle_session_id', newSession.id);
        } catch (err) {
            console.error('Error creating session:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    const startNewSession = useCallback(async () => {
        // Clear current session from localStorage first
        localStorage.removeItem('hypnoraffle_session_id');
        setSession(null);
        await createNewSession();
    }, [createNewSession]);

    const switchToSession = useCallback(async (targetSessionId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            // Try to fetch the target session
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', targetSessionId)
                .single();

            if (error || !data) {
                setLoading(false);
                return false;
            }

            const targetSession = data as Session;
            setSession(targetSession);
            localStorage.setItem('hypnoraffle_session_id', targetSession.id);
            setLoading(false);
            return true;
        } catch (err) {
            console.error('Error switching session:', err);
            setError(err as Error);
            setLoading(false);
            return false;
        }
    }, []);

    return {
        session,
        sessionId: session?.id || null,
        loading,
        error,
        startNewSession,
        switchToSession,
    };
}


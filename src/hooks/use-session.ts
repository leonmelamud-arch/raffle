'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/supabase';

interface Session {
  id: string;
  name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface QrRef {
  id: string;
  session_id: string;
  short_code: string;
  created_at: string;
}

interface UseSessionReturn {
  sessionId: string | null;
  session: Session | null;
  shortCode: string | null;
  loading: boolean;
  error: Error | null;
  createSession: (name?: string) => Promise<{ sessionId: string; shortCode: string } | null>;
  loadSession: (sessionId: string) => Promise<void>;
  clearSession: () => void;
}

const SESSION_STORAGE_KEY = 'hypnoraffle_session_id';

export function useSession(): UseSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load session from storage on mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (storedSessionId) {
      loadSession(storedSessionId);
    } else {
      setLoading(false);
    }
  }, []);

  // Load an existing session
  const loadSession = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await db
        .from<Session>('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!sessionData) {
        throw new Error('Session not found');
      }

      // Try to fetch QR ref for this session (optional - may not exist)
      let qrShortCode: string | null = null;
      try {
        const { data: qrData } = await db
          .from<QrRef>('qr_refs')
          .select('*')
          .eq('session_id', id)
          .single();
        qrShortCode = qrData ? (qrData as QrRef).short_code : null;
      } catch {
        // QR refs table might not exist or have different schema - that's ok
      }

      setSession(sessionData as Session);
      setSessionId(id);
      setShortCode(qrShortCode);
      localStorage.setItem(SESSION_STORAGE_KEY, id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load session'));
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSessionId(null);
      setSession(null);
      setShortCode(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate a random short code for QR refs
  const generateShortCode = (length: number = 6): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0,O,1,I,L)
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Create a new session with QR code
  const createSession = useCallback(async (name?: string): Promise<{ sessionId: string; shortCode: string } | null> => {
    setLoading(true);
    setError(null);

    try {
      // First, try RPC function
      const { data: rpcData, error: rpcError } = await db.rpc<{ session_id: string; short_code: string }[]>(
        'create_session_with_qr',
        { session_name: name || null }
      );

      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        const result = rpcData[0];
        setSessionId(result.session_id);
        setShortCode(result.short_code);
        localStorage.setItem(SESSION_STORAGE_KEY, result.session_id);
        await loadSession(result.session_id);
        return {
          sessionId: result.session_id,
          shortCode: result.short_code,
        };
      }

      // Fallback: Create session directly via INSERT
      
      // Insert session - try with minimal fields first (schema may vary)
      let sessionData: Session | null = null;
      let sessionError: Error | null = null;

      // First try with just is_active (minimal schema)
      const { data: data1, error: error1 } = await db
        .from<Session>('sessions')
        .insert({ is_active: true })
        .select()
        .single();

      if (!error1 && data1) {
        sessionData = data1 as Session;
      } else {
        // Try with name field too
        const { data: data2, error: error2 } = await db
          .from<Session>('sessions')
          .insert({ name: name || null, is_active: true })
          .select()
          .single();

        if (!error2 && data2) {
          sessionData = data2 as Session;
        } else {
          sessionError = error2 ? new Error(error2.message) : new Error('Failed to create session');
        }
      }

      if (sessionError || !sessionData) {
        throw sessionError || new Error('Failed to create session');
      }

      const newSessionId = (sessionData as Session).id;

      // Generate short code and create qr_ref
      let newShortCode = generateShortCode();
      let qrCreated = false;
      let attempts = 0;

      while (!qrCreated && attempts < 5) {
        const { error: qrError } = await db
          .from('qr_refs')
          .insert({ session_id: newSessionId, short_code: newShortCode });

        if (!qrError) {
          qrCreated = true;
        } else if (qrError.message.includes('duplicate') || qrError.message.includes('unique')) {
          // Generate a new code and try again
          newShortCode = generateShortCode();
          attempts++;
        } else {
          // Non-duplicate error, just log and continue without QR ref
          console.warn('[Session] Could not create QR ref:', qrError.message);
          break;
        }
      }

      setSessionId(newSessionId);
      setShortCode(qrCreated ? newShortCode : null);
      localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);

      // Load full session data
      setSession(sessionData as Session);

      return {
        sessionId: newSessionId,
        shortCode: qrCreated ? newShortCode : '',
      };
    } catch (err) {
      console.error('[Session] Error creating session:', err);
      setError(err instanceof Error ? err : new Error('Failed to create session'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadSession]);

  // Clear current session
  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionId(null);
    setSession(null);
    setShortCode(null);
    setError(null);
  }, []);

  return {
    sessionId,
    session,
    shortCode,
    loading,
    error,
    createSession,
    loadSession,
    clearSession,
  };
}


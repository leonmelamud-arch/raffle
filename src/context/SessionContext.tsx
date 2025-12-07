'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { Session } from '@/types';
import { useSession as useSessionHook } from '@/hooks/use-session';

interface SessionContextType {
    session: Session | null;
    sessionId: string | null;
    loading: boolean;
    error: Error | null;
    startNewSession: () => Promise<void>;
    switchToSession: (targetSessionId: string) => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
    const sessionState = useSessionHook();

    return (
        <SessionContext.Provider value={sessionState}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSessionContext() {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSessionContext must be used within a SessionProvider');
    }
    return context;
}

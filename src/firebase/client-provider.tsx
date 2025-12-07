'use client';

import { useMemo, type PropsWithChildren } from 'react';
import { FirebaseProvider, initializeFirebase } from '@/firebase';

export function FirebaseClientProvider({ children }: PropsWithChildren) {
  const value = useMemo(() => {
    const { app, firestore, auth } = initializeFirebase();
    return { app, firestore, auth };
  }, []);

  return <FirebaseProvider value={value}>{children}</FirebaseProvider>;
}

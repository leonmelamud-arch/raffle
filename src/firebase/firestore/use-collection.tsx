'use client';

import {
  onSnapshot,
  type CollectionReference,
  type DocumentData,
  type Query,
} from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function useCollection<T extends { id: string }>(
  queryOrRef: Query | CollectionReference | null
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const queryRef = useRef(queryOrRef);

  useEffect(() => {
    // Prevent re-running the effect if the query object itself is the same
    if (queryRef.current === queryOrRef && data) return;
    queryRef.current = queryOrRef;

    if (!queryOrRef) {
        setLoading(false);
        return;
    }
    
    setLoading(true);

    const unsubscribe = onSnapshot(
      queryOrRef,
      (snapshot) => {
        const items = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as T)
        );
        setData(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching collection:', error);
        const path = 'path' in queryOrRef ? queryOrRef.path : 'unknown path';
        const permissionError = new FirestorePermissionError({
            path: path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [queryOrRef, data]);

  return { data, loading };
}

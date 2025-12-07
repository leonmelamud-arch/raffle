'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface QrModalContextType {
    showQrModal: boolean;
    setShowQrModal: (show: boolean) => void;
    openQrModal: () => void;
    closeQrModal: () => void;
}

const QrModalContext = createContext<QrModalContextType | undefined>(undefined);

export function QrModalProvider({ children }: { children: ReactNode }) {
    const [showQrModal, setShowQrModal] = useState(false);

    const openQrModal = () => setShowQrModal(true);
    const closeQrModal = () => setShowQrModal(false);

    return (
        <QrModalContext.Provider value={{ showQrModal, setShowQrModal, openQrModal, closeQrModal }}>
            {children}
        </QrModalContext.Provider>
    );
}

export function useQrModal() {
    const context = useContext(QrModalContext);
    if (context === undefined) {
        throw new Error('useQrModal must be used within a QrModalProvider');
    }
    return context;
}

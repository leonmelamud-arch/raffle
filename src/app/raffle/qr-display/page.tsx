
"use client";

import { useEffect, useState } from 'react';
import QRCode from "react-qr-code";
import { Header } from "../../../components/layout/Header";
import { useParticipants } from "../../../context/ParticipantsContext";
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/button';

export default function QRDisplayPage() {
    const [url, setUrl] = useState('');
    const { setAllParticipants, setAvailableParticipants, allParticipants } = useParticipants();
    const router = useRouter();


    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentUrl = window.location.origin + '/raffle/qr';
            setUrl(currentUrl);
        }
    }, []);

    const handleParticipantsLoad = (newParticipants: any[]) => {
        const uniqueNew = newParticipants.filter(np => !allParticipants.some(ap => ap.id === np.id));

        if (uniqueNew.length > 0) {
            setAllParticipants(prev => [...prev, ...uniqueNew]);
            setAvailableParticipants(prev => [...prev, ...uniqueNew]);
        }
    };


    return (
        <main className="flex flex-col items-center min-h-screen w-full p-4 md:p-8 relative">
            <Header onParticipantsLoad={handleParticipantsLoad} isRaffling={false}>
                <Button onClick={() => router.push('/')} variant="outline" className="font-bold">
                    Back to Raffle
                </Button>
            </Header>
            <div className="flex-grow flex flex-col items-center justify-center w-full text-center">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-primary font-headline mb-4">
                    HypnoRaffle
                </h1>
                <h2 className="text-3xl font-bold text-card-foreground mb-4">Scan to Join the Raffle!</h2>
                <p className="text-muted-foreground mb-8">
                    Scan the QR code below with your phone to enter your name.
                </p>
                <div className="bg-white p-8 rounded-2xl shadow-2xl">
                    {url ? (
                        <QRCode value={url} size={256} />
                    ) : (
                        <div className="w-64 h-64 bg-gray-200 animate-pulse rounded-md" />
                    )}
                </div>
            </div>
        </main>
    );
}

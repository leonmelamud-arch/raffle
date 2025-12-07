"use client";

import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { QrCode, Upload } from 'lucide-react';
import React from 'react';
import { ParticipantImporter } from '../raffle/ParticipantImporter';

const logo = PlaceHolderImages.find(img => img.id === 'mcp-logo');

export function Header({ onParticipantsLoad, isRaffling, children }: { onParticipantsLoad: (participants: any[]) => void, isRaffling: boolean, children?: React.ReactNode }) {
  const router = useRouter();
  return (
    <header className="py-6 px-4 flex justify-between items-center w-full">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-primary font-headline">
          HypnoRaffle
        </h1>
      <div className="flex items-center gap-4">
        {children}
        <ParticipantImporter onParticipantsLoad={onParticipantsLoad} disabled={isRaffling}>
            <Button variant="secondary" disabled={isRaffling}>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
            </Button>
        </ParticipantImporter>
        <Button variant="secondary" onClick={() => router.push('/qr-display')}>
          <QrCode className="mr-2 h-4 w-4" />
          Show QR
        </Button>
         {logo && (
            <Image
              src={logo.imageUrl}
              alt={logo.description}
              width={56}
              height={56}
              className="rounded-full shadow-lg border-2 border-primary"
              data-ai-hint={logo.imageHint}
            />
          )}
      </div>
    </header>
  );
}

"use client";

import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { QrCode, Upload, Sparkles } from 'lucide-react';
import React, { useRef } from 'react';
import { ParticipantImporter } from '../raffle/ParticipantImporter';

const placeholderLogo = PlaceHolderImages.find(img => img.id === 'mcp-logo');

interface HeaderProps {
  onParticipantsLoad: (participants: any[]) => void;
  isRaffling: boolean;
  onLogoRain: () => void;
  logoUrl?: string;
  onLogoChange: (file: File) => void;
  children?: React.ReactNode;
}

export function Header({ onParticipantsLoad, isRaffling, onLogoRain, logoUrl, onLogoChange, children }: HeaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLogoChange(file);
    }
  };

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
        <Button variant="outline" size="sm" onClick={onLogoRain}>
            <Sparkles className="mr-2 h-4 w-4" />
            Logos
        </Button>
         {logoUrl && (
            <button onClick={handleLogoClick} className="cursor-pointer group relative">
                <Image
                  src={logoUrl}
                  alt={placeholderLogo?.description || "Raffle Logo"}
                  width={56}
                  height={56}
                  className="rounded-full shadow-lg border-2 border-primary group-hover:opacity-70 transition-opacity"
                  data-ai-hint={placeholderLogo?.imageHint}
                />
                 <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold">Change</span>
                </div>
            </button>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            accept="image/*" 
            className="hidden" 
           />
      </div>
    </header>
  );
}

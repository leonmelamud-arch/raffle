"use client";

import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { QrCode, Upload, Sparkles } from 'lucide-react';
import React from 'react';
import { ParticipantImporter } from '../raffle/ParticipantImporter';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


interface HeaderProps {
  onParticipantsLoad: (participants: any[]) => void;
  isRaffling: boolean;
  onLogoRain: () => void;
  children?: React.ReactNode;
}

export function Header({ onParticipantsLoad, isRaffling, onLogoRain, children }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="py-6 px-4 flex justify-between items-start w-full">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-primary font-headline">
          HypnoRaffle
        </h1>
      <div className="flex flex-col items-center gap-2">
        {children}
         <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <ParticipantImporter onParticipantsLoad={onParticipantsLoad} disabled={isRaffling}>
                    <Button variant="outline" size="icon" disabled={isRaffling}>
                        <Upload className="h-5 w-5" />
                    </Button>
                </ParticipantImporter>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Upload CSV</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => router.push('/qr-display')}>
                        <QrCode className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                    <p>Show QR Code</p>
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={onLogoRain}>
                        <Sparkles className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                    <p>Rain Logos</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}

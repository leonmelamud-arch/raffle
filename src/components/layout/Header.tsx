"use client";

import { Button } from '../ui/button';
import { QrCode, Upload, Sparkles } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { ParticipantImporter } from '../raffle/ParticipantImporter';
import { useQrModal } from '../../context/QrModalContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip"


interface HeaderProps {
  onParticipantsLoad: (participants: any[]) => void;
  isRaffling: boolean;
  onLogoRain?: () => void;
  children?: React.ReactNode;
}

export function Header({ onParticipantsLoad, isRaffling, onLogoRain, children }: HeaderProps) {
  const { openQrModal } = useQrModal();
  const [isPulsing, setIsPulsing] = useState(true);

  useEffect(() => {
    // Stop pulsing after 5 seconds, but keep button visible
    const pulseTimer = setTimeout(() => {
      setIsPulsing(false);
    }, 5000);

    return () => {
      clearTimeout(pulseTimer);
    };
  }, []);

  const handleSparklesClick = () => {
    // Reset pulsing when clicked
    setIsPulsing(true);

    // Trigger the logo rain
    onLogoRain?.();

    // Stop pulsing again after 5 seconds
    setTimeout(() => setIsPulsing(false), 5000);
  };

  return (
    <header className="py-6 px-4 flex justify-between items-start w-full absolute top-0 left-0 right-0">
      <div>
        {/* Intentionally left blank to push other items to the right */}
      </div>
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
              <Button variant="outline" size="icon" onClick={openQrModal}>
                <QrCode className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Show QR Code</p>
            </TooltipContent>
          </Tooltip>

          {onLogoRain && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleSparklesClick}
                  className={`
                            h-14 w-14 rounded-xl
                            transition-all duration-1000 ease-in-out
                            ${isPulsing ? 'animate-pulse scale-110' : 'scale-100'}
                          `}
                >
                  <Sparkles className="h-8 w-8" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Rain Logos</p>
              </TooltipContent>
            </Tooltip>
          )}

        </TooltipProvider>
      </div>
    </header>
  );
}


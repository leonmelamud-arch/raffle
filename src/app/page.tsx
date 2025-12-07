"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Participant } from '@/types';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { SlotMachine } from '@/components/raffle/SlotMachine';
import { secureRandom } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Trophy } from 'lucide-react';
import { useParticipants } from '@/context/ParticipantsContext';
import { Confetti } from '@/components/raffle/Confetti';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const initialLogo = PlaceHolderImages.find(img => img.id === 'mcp-logo');

export default function Home() {
  const { allParticipants, setAllParticipants, availableParticipants, setAvailableParticipants } = useParticipants();
  const [winner, setWinner] = useState<Participant | null>(null);
  const [isRaffling, setIsRaffling] = useState(false);
  const [spinHasEnded, setSpinHasEnded] = useState(false);
  const [isRainingLogos, setIsRainingLogos] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(initialLogo?.imageUrl);
  const { toast } = useToast();

  const handleParticipantsLoad = (newParticipants: Participant[]) => {
    const uniqueNew = newParticipants.filter(np => !allParticipants.some(ap => ap.id === np.id));
    
    if (uniqueNew.length > 0) {
      setAllParticipants(prev => [...prev, ...uniqueNew]);
      setAvailableParticipants(prev => [...prev, ...uniqueNew]);
      toast({
        title: "Participants Added",
        description: `${uniqueNew.length} new participants have been added to the raffle.`,
      });
    } else {
       toast({
        title: "No New Participants",
        description: "The imported participants are already in the raffle.",
        variant: "destructive"
      });
    }
  };
  
  const handleLogoChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newUrl = e.target?.result as string;
      setLogoUrl(newUrl);
      toast({
        title: "Logo Updated",
        description: "The new logo has been applied.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleStartRaffle = () => {
    if (availableParticipants.length === 0) {
      toast({
        title: "Raffle is empty!",
        description: "Please add participants before starting.",
        variant: "destructive"
      });
      return;
    }
    setSpinHasEnded(false);
    setIsRaffling(true);
    const winnerIndex = secureRandom(availableParticipants.length);
    const pickedWinner = availableParticipants[winnerIndex];
    setWinner(pickedWinner);
  };

  const handleSpinEnd = () => {
    setSpinHasEnded(true);
  };
  
  const handleNextRound = () => {
    setSpinHasEnded(false);
    setIsRaffling(false);
    if (winner) {
      setAvailableParticipants(prev => prev.filter(p => p.id !== winner.id));
    }
    setWinner(null);
  };
  
  const handleLogoRain = () => {
    setIsRainingLogos(true);
    setTimeout(() => setIsRainingLogos(false), 5000); // Stop the rain after 5 seconds
  };

  const participantCount = useMemo(() => allParticipants.length, [allParticipants]);
  const availableCount = useMemo(() => availableParticipants.length, [availableParticipants]);

  return (
    <>
      <Confetti isCelebrating={spinHasEnded || isRainingLogos} image={isRainingLogos ? logoUrl : undefined} />
      <main className="flex flex-col items-center justify-between min-h-screen w-full p-4 md:p-8">
        <Header 
          onParticipantsLoad={handleParticipantsLoad} 
          isRaffling={isRaffling} 
          onLogoRain={handleLogoRain} 
          logoUrl={logoUrl}
          onLogoChange={handleLogoChange}
        />
        
        <div className="w-full max-w-4xl mx-auto flex-grow flex flex-col items-center justify-center gap-8">
          <SlotMachine 
            participants={allParticipants} 
            winner={winner} 
            isSpinning={isRaffling} 
            onSpinEnd={handleSpinEnd} 
          />
          <div className="flex flex-wrap gap-4 items-center justify-center">
             {!spinHasEnded ? (
                <Button 
                onClick={handleStartRaffle} 
                disabled={isRaffling || availableParticipants.length === 0}
                size="lg"
                className="font-bold text-lg"
                variant="default"
              >
                <Trophy className="mr-2 h-5 w-5" />
                Start Raffle
              </Button>
             ) : (
              <Button onClick={handleNextRound} size="lg" className="font-bold text-lg">
                Prepare Next Round
              </Button>
             )}
          </div>
        </div>

        <footer className="text-center text-foreground/80 mt-8">
          <p>Participants: {participantCount} | Available for this round: {availableCount}</p>
        </footer>
      </main>
    </>
  );
}

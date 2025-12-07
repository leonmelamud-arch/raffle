"use client";

import { useState, useMemo } from 'react';
import type { Participant } from '@/types';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { ParticipantImporter } from '@/components/raffle/ParticipantImporter';
import { SlotMachine } from '@/components/raffle/SlotMachine';
import { WinnerModal } from '@/components/raffle/WinnerModal';
import { secureRandom } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Trophy } from 'lucide-react';

export default function Home() {
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [isRaffling, setIsRaffling] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
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

  const handleStartRaffle = () => {
    if (availableParticipants.length === 0) {
      toast({
        title: "Raffle is empty!",
        description: "Please add participants before starting.",
        variant: "destructive"
      });
      return;
    }
    setIsRaffling(true);
    const winnerIndex = secureRandom(availableParticipants.length);
    const pickedWinner = availableParticipants[winnerIndex];
    setWinner(pickedWinner);
  };

  const handleSpinEnd = () => {
    setShowWinnerModal(true);
  };
  
  const handleNextRound = () => {
    setShowWinnerModal(false);
    setIsRaffling(false);
    if (winner) {
      setAvailableParticipants(prev => prev.filter(p => p.id !== winner.id));
    }
    // Delay setting winner to null to avoid modal content disappearing during closing animation
    setTimeout(() => setWinner(null), 300);
  };

  const participantCount = useMemo(() => allParticipants.length, [allParticipants]);
  const availableCount = useMemo(() => availableParticipants.length, [availableParticipants]);

  return (
    <>
      <main className="flex flex-col items-center justify-between min-h-screen w-full p-4 md:p-8">
        <Header />

        <div className="w-full max-w-4xl mx-auto flex-grow flex flex-col items-center justify-center gap-8">
          <SlotMachine 
            participants={allParticipants} 
            winner={winner} 
            isSpinning={isRaffling} 
            onSpinEnd={handleSpinEnd} 
          />
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <ParticipantImporter onParticipantsLoad={handleParticipantsLoad} disabled={isRaffling} />
            <Button 
              onClick={handleStartRaffle} 
              disabled={isRaffling || availableParticipants.length === 0}
              size="lg"
              className="font-bold text-lg"
            >
              <Trophy className="mr-2 h-5 w-5" />
              Start Raffle
            </Button>
          </div>
        </div>

        <footer className="text-center text-primary-foreground/80 mt-8">
          <p>Participants: {participantCount} | Available for this round: {availableCount}</p>
        </footer>
      </main>
      <WinnerModal 
        open={showWinnerModal}
        onOpenChange={setShowWinnerModal}
        winner={winner}
        onNextRound={handleNextRound}
      />
    </>
  );
}

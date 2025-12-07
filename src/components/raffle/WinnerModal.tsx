"use client";

import type { Participant } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Confetti } from "./Confetti";

interface WinnerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winner: Participant | null;
  onNextRound: () => void;
}

export function WinnerModal({ open, onOpenChange, winner, onNextRound }: WinnerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-background/80 backdrop-blur-md border-primary text-center overflow-hidden">
        <Confetti isCelebrating={open} />
        <DialogHeader className="z-10 mt-8">
          <DialogTitle className="text-3xl text-primary font-headline tracking-widest uppercase">
            Congratulations!
          </DialogTitle>
        </DialogHeader>
        <div className="py-8 z-10">
          <p className="text-6xl font-bold text-primary-foreground break-words">
            {winner?.displayName || ''}
          </p>
        </div>
        <DialogFooter className="z-10 mb-4">
          <Button onClick={onNextRound} className="w-full text-lg font-bold" size="lg">
            Prepare Next Round
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

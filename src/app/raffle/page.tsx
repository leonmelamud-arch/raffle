"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import type { Participant } from '../../types';
import { Button } from '../../components/ui/button';
import { Header } from '../../components/layout/Header';
import { SlotMachine } from '../../components/raffle/SlotMachine';
import { SessionIndicator } from '../../components/raffle/SessionIndicator';
import { ParticipantsList } from '../../components/raffle/ParticipantsList';
import { secureRandom } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';
import { Trophy, ServerCrash, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useParticipants } from '../../context/ParticipantsContext';
import { useSessionContext } from '../../context/SessionContext';
import { Confetti } from '../../components/raffle/Confetti';
import Image from 'next/image';
import { db } from '../../lib/postgrest';
import placeholderData from '../../lib/placeholder-images.json';

interface AvailableImage {
  id: string;
  src: string;
  alt: string;
}

export default function Home() {
  const {
    allParticipants,
    setAllParticipants,
    availableParticipants,
    setAvailableParticipants,
    loading,
    error,
    refetch
  } = useParticipants();

  const { sessionId } = useSessionContext();

  const [winner, setWinner] = useState<Participant | null>(null);
  const [isRaffling, setIsRaffling] = useState(false);
  const [spinHasEnded, setSpinHasEnded] = useState(false);
  const [isRainingLogos, setIsRainingLogos] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [availableImages, setAvailableImages] = useState<AvailableImage[]>(
    placeholderData.images || [{ id: 'linkedin-qr-leon', src: '/images/linkedin-qr-leon.svg', alt: 'LinkedIn QR Code' }]
  );
  const [imagesLoading, setImagesLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset raffle state when session changes
  useEffect(() => {
    setWinner(null);
    setIsRaffling(false);
    setSpinHasEnded(false);
    setIsRainingLogos(false);
  }, [sessionId]);

  // Fetch available images from API (with fallback to static list)
  const fetchImages = async () => {
    setImagesLoading(true);
    try {
      const response = await fetch('/api/images');
      if (!response.ok) throw new Error('API not available');
      const data = await response.json();
      if (data.images && data.images.length > 0) {
        setAvailableImages(data.images);
        setCurrentImageIndex(0);
        toast({
          title: "Images Loaded",
          description: `Found ${data.images.length} images.`,
        });
      } else {
        // Fallback to static list
        const staticImages = placeholderData.images || [];
        if (staticImages.length > 0) {
          setAvailableImages(staticImages);
          toast({
            title: "Using Static Images",
            description: `Loaded ${staticImages.length} images from config.`,
          });
        } else {
          toast({
            title: "No Images",
            description: "No images found.",
            variant: "destructive"
          });
        }
      }
    } catch (err) {
      console.error('Failed to load images from API, using static list:', err);
      // Fallback to static list when API unavailable (GitHub Pages)
      const staticImages = placeholderData.images || [];
      if (staticImages.length > 0) {
        setAvailableImages(staticImages);
        toast({
          title: "Images Loaded",
          description: `Using ${staticImages.length} pre-configured images.`,
        });
      }
    } finally {
      setImagesLoading(false);
    }
  };

  // Computed logo URL - use custom if set, otherwise use current image from array
  const logoUrl = customLogoUrl || availableImages[currentImageIndex]?.src;
  const logoAlt = customLogoUrl ? 'Custom Logo' : availableImages[currentImageIndex]?.alt;

  const handlePrevImage = () => {
    setCustomLogoUrl(null); // Clear custom logo when navigating
    setCurrentImageIndex((prev) => (prev === 0 ? availableImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCustomLogoUrl(null); // Clear custom logo when navigating
    setCurrentImageIndex((prev) => (prev === availableImages.length - 1 ? 0 : prev + 1));
  };
  // Supabase instance is imported globally if needed, or we can use the hook logic.
  // Actually, for this component we can just import the client directly.
  const handleParticipantsLoad = async (newParticipants: Participant[]) => {

    // Client-side filtering logic from original code
    const existingDisplayNames = new Set(allParticipants.map(p => p.display_name));
    const uniqueNew = newParticipants.filter(p => !existingDisplayNames.has(p.display_name));

    if (uniqueNew.length > 0) {
      if (!sessionId) {
        toast({
          title: "Session Error",
          description: "No active session. Please refresh the page.",
          variant: "destructive"
        });
        return;
      }

      try {
        // Map to the shape expected by Supabase, including session_id
        // Note: id is auto-generated by Supabase as UUID
        const participantsToInsert = uniqueNew.map(participant => ({
          name: participant.name,
          last_name: participant.last_name,
          display_name: participant.display_name,
          session_id: sessionId,
          email: participant.email,
        }));

        const { error: insertError } = await db.from('participants').insert(participantsToInsert);

        if (insertError) throw insertError;

        // Refresh participants list immediately
        await refetch();

        toast({
          title: "Participants Added",
          description: `${uniqueNew.length} new participants added to session ${sessionId?.substring(0, 8).toUpperCase()}.`,
        });

      } catch (error) {
        console.error("Error adding participants: ", error);
        toast({
          title: "Import Error",
          description: "Could not save participants to the database.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "No New Participants",
        description: "The imported participants are already in the raffle.",
      });
    }
  };

  const handleLogoChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newUrl = e.target?.result as string;
      setCustomLogoUrl(newUrl);
      toast({
        title: "Logo Updated",
        description: "The custom logo has been applied.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoChange(file);
    }
  };

  const handleStartRaffle = () => {
    if (availableParticipants.length === 0) {
      toast({
        title: "Raffle is empty!",
        description: "Please add participants or reset the raffle.",
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

  const handleSpinEnd = async () => {
    setSpinHasEnded(true);

    if (winner) {
      // Send webhook notification
      const webhookUrl = process.env.NEXT_PUBLIC_WINNER_WEBHOOK_URL;
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: winner.name,
              last_name: winner.last_name,
              email: winner.email
            })
          });
        } catch (err) {
          console.error('Webhook failed:', err);
          toast({
            title: 'Webhook Error',
            description: 'Failed to send winner notification.',
            variant: 'destructive'
          });
        }
      }
    }
  };

  const handleNextRound = async () => {
    setSpinHasEnded(false);
    setIsRaffling(false);
    if (winner) {
      // Mark winner in database
      try {
        const { error: updateError } = await db
          .from('participants')
          .update({ won: true })
          .eq('id', winner.id);

        if (updateError) {
          console.error('Failed to mark winner in DB:', updateError);
        }
      } catch (err) {
        console.error('Failed to mark winner in DB:', err);
      }

      const remaining = availableParticipants.filter(p => p.id !== winner.id);
      setAvailableParticipants(remaining);

      // If that was the last participant, reset available to all for the next major round
      if (remaining.length === 0 && allParticipants.length > 0) {
        toast({
          title: 'Round Complete!',
          description: 'All participants have been chosen. Resetting for a new round.',
        });
        // Reset all winners in DB
        try {
          await db
            .from('participants')
            .update({ won: false })
            .eq('session_id', sessionId!);
        } catch (err) {
          console.error('Failed to reset winners in DB:', err);
        }
        setAvailableParticipants(allParticipants);
      }
    }
    setWinner(null);
  };

  const handleLogoRain = () => {
    if (isRainingLogos) {
      setIsRainingLogos(false);
    } else {
      setIsRainingLogos(true);
      setTimeout(() => setIsRainingLogos(false), 20000); // Stop the rain after 20 seconds
    }
  };

  const handleResetRaffle = async () => {
    // Reset all winners in DB
    try {
      await db
        .from('participants')
        .update({ won: false })
        .eq('session_id', sessionId!);
    } catch (err) {
      console.error('Failed to reset winners in DB:', err);
    }
    setAvailableParticipants(allParticipants);
    setWinner(null);
    setIsRaffling(false);
    setSpinHasEnded(false);
    toast({
      title: 'Raffle Reset',
      description: 'All participants are now available for the next round.',
    });
  }

  const participantCount = useMemo(() => allParticipants.length, [allParticipants]);
  const availableCount = useMemo(() => availableParticipants.length, [availableParticipants]);

  const getLoadingMessage = () => {
    if (loading) return "Loading Participants...";
    return "Start Raffle";
  }

  return (
    <>
      <Confetti isCelebrating={spinHasEnded || isRainingLogos} image={logoUrl} />
      <SessionIndicator />
      <ParticipantsList />
      <main className="flex flex-col items-center justify-start min-h-screen w-full p-4 md:p-8 pt-20 md:pt-24 relative">
        <Header
          onParticipantsLoad={handleParticipantsLoad}
          isRaffling={isRaffling}
          onLogoRain={handleLogoRain}
        />

        <div className="w-full max-w-2xl mx-auto flex-grow flex flex-col items-center justify-start gap-8">

          <div className="w-full max-w-lg flex flex-col items-center gap-2">
            <div className="relative w-full">
              {logoUrl ? (
                <button onClick={handleLogoClick} className="cursor-pointer group relative w-full flex justify-center">
                  <Image
                    src={logoUrl}
                    alt={logoAlt || "Raffle Logo"}
                    width={480}
                    height={240}
                    className="object-contain group-hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm font-bold">Upload Custom</span>
                  </div>
                </button>
              ) : (
                <div className="w-full h-[240px] flex items-center justify-center border-2 border-dashed border-primary/30 rounded-lg">
                  <span className="text-muted-foreground">No images loaded</span>
                </div>
              )}

              {availableImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-30"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-6 w-6 text-white" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-30"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-6 w-6 text-white" />
                  </button>
                </>
              )}

              <button
                onClick={fetchImages}
                disabled={imagesLoading}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors disabled:opacity-50 z-30"
                aria-label="Refresh images"
                title="Load images from /public/images"
              >
                <RefreshCw className={`h-4 w-4 text-white ${imagesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <SlotMachine
            participants={availableParticipants}
            winner={winner}
            isSpinning={isRaffling}
            onSpinEnd={handleSpinEnd}
            loading={loading && allParticipants.length === 0}
            error={error}
          />
          <div className="flex flex-wrap gap-4 items-center justify-center">
            {!isRaffling && !spinHasEnded ? (
              <Button
                onClick={handleStartRaffle}
                disabled={isRaffling || loading || availableParticipants.length === 0 || !!error}
                size="lg"
                className="font-bold text-lg"
                variant={error ? "destructive" : "default"}
              >
                {error ? <ServerCrash className="mr-2 h-5 w-5" /> : <Trophy className="mr-2 h-5 w-5" />}
                {error ? "Connection Failed" : getLoadingMessage()}
              </Button>
            ) : spinHasEnded ? (
              <Button onClick={handleNextRound} size="lg" className="font-bold text-lg">
                Prepare Next Round
              </Button>
            ) : null}

            {availableCount === 0 && participantCount > 0 && !isRaffling && (
              <Button onClick={handleResetRaffle} size="lg" variant="secondary">
                Reset Raffle
              </Button>
            )}

          </div>

          {spinHasEnded && winner && (
            <div className="w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                {winner.email || winner.display_name}
              </p>
            </div>
          )}
        </div>

        <footer className="text-center text-foreground/80 mt-8">
          <p>Total Participants: {participantCount} | Available this round: {availableCount}</p>
        </footer>
      </main>
    </>
  );
}

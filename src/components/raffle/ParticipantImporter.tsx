"use client";

import React, { useRef, useState } from 'react';
import type { Participant } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Upload, QrCode, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeModal } from './QRCodeModal';

interface ParticipantImporterProps {
  onParticipantsLoad: (participants: Participant[]) => void;
  disabled?: boolean;
}

export function ParticipantImporter({ onParticipantsLoad, disabled }: ParticipantImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isQrModalOpen, setQrModalOpen] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).slice(1); // Skip header, handle both LF and CRLF

        const newParticipants: Participant[] = lines
          .map((line, index) => {
            if (!line.trim()) return null;
            const [name, lastName, status] = line.split(',').map(s => s.trim().replace(/"/g, ''));
            if (status && status.toLowerCase() === 'approved' && name && lastName) {
              return {
                id: `${name}-${lastName}-${index}`, // More stable ID for same file
                name,
                lastName,
                displayName: `${name} ${lastName.charAt(0)}.`,
              };
            }
            return null;
          })
          .filter((p): p is Participant => p !== null);

        if (newParticipants.length > 0) {
          onParticipantsLoad(newParticipants);
        } else {
          toast({
            title: "Import Failed",
            description: "No 'approved' participants found in the CSV file. Check file format.",
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "Import Error",
          description: "Could not read the CSV file. Please ensure it's a valid format.",
          variant: "destructive"
        });
      } finally {
        // Reset file input to allow re-uploading the same file
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.onerror = () => {
       toast({
          title: "File Read Error",
          description: "There was an error reading your file.",
          variant: "destructive"
        });
    };
    reader.readAsText(file);
  };
  
  const handleManualAdd = (participant: Omit<Participant, 'id' | 'displayName'>) => {
    const newParticipant: Participant = {
        ...participant,
        id: `${participant.name}-${participant.lastName}-${Math.random()}`,
        displayName: `${participant.name} ${participant.lastName.charAt(0)}.`,
    }
    onParticipantsLoad([newParticipant]);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" disabled={disabled}>
            <UserPlus className="mr-2 h-4 w-4" /> Add Participants
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Upload CSV</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setQrModalOpen(true)}>
            <QrCode className="mr-2 h-4 w-4" />
            <span>Scan QR (Manual Entry)</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".csv"
        onChange={handleFileChange}
      />
      <QRCodeModal open={isQrModalOpen} onOpenChange={setQrModalOpen} onAddParticipant={handleManualAdd} />
    </>
  );
}

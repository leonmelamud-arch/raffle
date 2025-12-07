"use client";

import React, { useRef } from 'react';
import type { Participant } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ParticipantImporterProps {
  onParticipantsLoad: (participants: Participant[]) => void;
  disabled?: boolean;
  children: React.ReactElement;
}

export function ParticipantImporter({ onParticipantsLoad, disabled, children }: ParticipantImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
            toast({
                title: "Import Failed",
                description: "CSV file is empty or missing headers.",
                variant: "destructive"
            });
            return;
        }
        
        const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const firstNameIndex = header.indexOf('first_name');
        const lastNameIndex = header.indexOf('last_name');
        const nameIndex = header.indexOf('name');

        if (firstNameIndex === -1 || nameIndex === -1) {
            toast({
                title: "Import Failed",
                description: "CSV must contain at least 'first_name' and 'name' columns.",
                variant: "destructive"
            });
            return;
        }

        const newParticipants: Participant[] = lines
          .slice(1)
          .map((line, index) => {
            if (!line.trim()) return null;
            const data = line.split(',').map(s => s.trim().replace(/"/g, ''));
            const firstName = data[firstNameIndex];
            const lastName = lastNameIndex !== -1 ? data[lastNameIndex] : '';
            const name = data[nameIndex];
            
            if (firstName) {
              return {
                id: `${firstName}-${lastName}-${index}`,
                name: firstName,
                lastName: lastName,
                displayName: lastName ? `${firstName} ${lastName}` : name,
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
            description: "No valid participants found in the CSV file.",
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
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {React.cloneElement(children, { onClick: triggerFileInput, disabled })}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".csv"
        onChange={handleFileChange}
      />
    </>
  );
}

"use client";

import React, { useRef } from 'react';
import type { Participant } from '../../types';
import { useToast } from '../../hooks/use-toast';

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
        const displayNameIndex = header.indexOf('display_name');
        const emailIndex = header.indexOf('email');
        const approvalStatusIndex = header.indexOf('approval_status');

        if (nameIndex === -1 && displayNameIndex === -1 && (firstNameIndex === -1 || lastNameIndex === -1)) {
          toast({
            title: "Import Failed",
            description: "CSV must contain a 'name' column, a 'display_name' column, or 'first_name' and 'last_name' columns.",
            variant: "destructive"
          });
          return;
        }

        const newParticipants: Participant[] = lines
          .slice(1)
          .map((line, index): Participant | null => {
            if (!line.trim()) return null;
            const data = line.split(',').map(s => s.trim().replace(/"/g, ''));

            const status = approvalStatusIndex !== -1 ? data[approvalStatusIndex] : undefined;
            if (approvalStatusIndex !== -1 && status?.toLowerCase() !== 'approved') {
              return null;
            }

            const firstName = firstNameIndex !== -1 ? data[firstNameIndex] : '';
            const lastName = lastNameIndex !== -1 ? data[lastNameIndex] : '';
            const name = nameIndex !== -1 ? data[nameIndex] : '';
            const displayName = displayNameIndex !== -1 ? data[displayNameIndex] : '';
            const email = emailIndex !== -1 ? data[emailIndex] : undefined;

            if (displayName) {
              const nameParts = displayName.split(' ');
              return {
                id: `${displayName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
                name: nameParts[0],
                last_name: nameParts.slice(1).join(' '),
                display_name: displayName,
                email,
              };
            }

            if (name) {
              const nameParts = name.split(' ');
              return {
                id: `${name.toLowerCase().replace(/\s+/g, '-')}-${index}`,
                name: nameParts[0],
                last_name: nameParts.slice(1).join(' '),
                display_name: name,
                email,
              };
            }

            if (firstName && lastName) {
              return {
                id: `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${index}`,
                name: firstName,
                last_name: lastName,
                display_name: `${firstName} ${lastName}`,
                email,
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
            description: "No eligible participants found (check approval_status).",
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
        title: "File ReadError",
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
      {React.cloneElement(children as React.ReactElement<any>, { onClick: triggerFileInput, disabled })}
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

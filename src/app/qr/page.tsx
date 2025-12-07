"use client";
import React, { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters.").max(50),
});

export default function QRPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isValidatingSession, setIsValidatingSession] = useState(true);

  // Get session ID from URL parameter
  useEffect(() => {
    const sid = searchParams.get('session');

    if (!sid) {
      setSessionError('No session ID provided. Please scan the QR code from the raffle host.');
      setIsValidatingSession(false);
      return;
    }

    // Validate that the session exists
    const validateSession = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sid)
        .single();

      if (error || !data) {
        setSessionError('Invalid session. This raffle session may have expired or does not exist.');
        setIsValidatingSession(false);
        return;
      }

      setSessionId(sid);
      setIsValidatingSession(false);
    };

    validateSession();
  }, [searchParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      lastName: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "No valid session. Please scan the QR code again.",
        variant: "destructive",
      });
      return;
    }

    const display_name = `${values.name} ${values.lastName}`;

    const newParticipant = {
      name: values.name,
      last_name: values.lastName,
      display_name: display_name,
      session_id: sessionId,
    };

    const { error } = await supabase
      .from('participants')
      .insert(newParticipant);

    if (error) {
      console.error('Supabase error:', error);
      toast({
        title: "Error",
        description: "Could not add you to the raffle. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "You're in!",
        description: `Welcome to the raffle, ${display_name}!`,
      });
      form.reset();
    }
  }

  if (isValidatingSession) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen w-full p-4 md:p-8 bg-background">
        <div className="text-center">
          <div className="animate-pulse text-lg">Validating session...</div>
        </div>
      </main>
    );
  }

  if (sessionError) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen w-full p-4 md:p-8 bg-background">
        <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-2xl text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-card-foreground mb-2">Session Error</h2>
          <p className="text-muted-foreground">{sessionError}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full p-4 md:p-8 bg-background">
      <div className="flex-grow flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-primary font-headline mb-4">
              HypnoRaffle
            </h1>
            <h2 className="text-2xl font-bold text-card-foreground">Join the Raffle</h2>
            <p className="text-muted-foreground">
              Enter your details below to get your ticket.
            </p>
            <div className="mt-2 text-xs text-muted-foreground/60">
              Session: {sessionId?.substring(0, 8).toUpperCase()}
            </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-4 mt-4">
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Joining...' : 'Join Raffle'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </main>
  );
}

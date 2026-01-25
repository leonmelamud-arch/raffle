"use client";
import React, { useEffect, useState, Suspense } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from "@/lib/postgrest";
import isEmail from 'validator/lib/isEmail';

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

// List of common disposable/temporary email domains to block
const disposableEmailDomains = [
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'guerrillamail.org',
  'sharklasers.com', 'grr.la', 'mailinator.com', 'maildrop.cc', 'temp-mail.org',
  '10minutemail.com', 'fakeinbox.com', 'trashmail.com', 'yopmail.com',
  'getnada.com', 'mohmal.com', 'tempail.com', 'dispostable.com', 'mailnesia.com',
  'mintemail.com', 'tempr.email', 'discard.email', 'spamgourmet.com', 'mytemp.email',
  'throwawaymail.com', 'emailondeck.com', 'tempmailaddress.com', 'burnermail.io',
];

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters.").max(50),
  email: z.string()
    .min(1, "Email is required.")
    .refine(
      (email) => isEmail(email, { 
        require_tld: true,
        allow_ip_domain: false,
        domain_specific_validation: true,
      }),
      "Please enter a valid email address."
    )
    .refine(
      (email) => {
        const domain = email.split('@')[1]?.toLowerCase();
        return !disposableEmailDomains.includes(domain);
      },
      "Disposable email addresses are not allowed. Please use a real email."
    ),
});

function QRForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isValidatingSession, setIsValidatingSession] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  // Get session ID from URL parameter and check local storage
  useEffect(() => {
    const sid = searchParams.get('session');

    if (!sid) {
      setSessionError('No session ID provided. Please scan the QR code from the raffle host.');
      setIsValidatingSession(false);
      return;
    }

    // Check if already registered for this session
    const storageKey = `raffle_joined_${sid}`;
    if (localStorage.getItem(storageKey)) {
      setSessionId(sid);
      setIsRegistered(true);
      setIsValidatingSession(false);
      return;
    }

    // Validate that the session exists
    const validateSession = async () => {
      const { data, error } = await db
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
      email: "",
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

    // Check for duplicate email in this session
    const { data: existingParticipant, error: checkError } = await db
      .from('participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('email', values.email)
      .single();

    if (existingParticipant) {
      toast({
        title: "Email Already Used",
        description: "This email has already been registered for this raffle!",
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
      email: values.email,
    };

    const { error } = await db
      .from('participants')
      .insert(newParticipant);

    if (error) {
      console.error('PostgREST error:', error);
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

      // Save to local storage
      localStorage.setItem(`raffle_joined_${sessionId}`, 'true');
      setIsRegistered(true);
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

  if (isRegistered) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen w-full p-4 md:p-8 bg-background">
        <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-2xl text-center">
          <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-3xl font-bold text-card-foreground mb-2">You're in!</h2>
          <p className="text-muted-foreground mb-6">
            You have successfully joined the raffle. Good luck!
          </p>
          <div className="text-xs text-muted-foreground/60">
            Session: {sessionId?.substring(0, 8).toUpperCase()}
          </div>
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
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
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

export default function QRPage() {
  return (
    <Suspense fallback={
      <main className="flex flex-col items-center justify-center min-h-screen w-full p-4 md:p-8 bg-background">
        <div className="text-center">
          <div className="animate-pulse text-lg">Loading...</div>
        </div>
      </main>
    }>
      <QRForm />
    </Suspense>
  );
}

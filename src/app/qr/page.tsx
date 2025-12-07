"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'next/navigation';

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
import { useParticipants } from "@/context/ParticipantsContext";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters.").max(50),
});

export default function QRPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setAllParticipants, setAvailableParticipants, allParticipants } = useParticipants();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      lastName: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newParticipant = {
      id: `${values.name}-${values.lastName}-${Date.now()}`,
      name: values.name,
      lastName: values.lastName,
      displayName: `${values.name} ${values.lastName.charAt(0)}.`,
    };
    
    setAllParticipants(prev => [...prev, newParticipant]);
    setAvailableParticipants(prev => [...prev, newParticipant]);
    
    toast({
      title: "You're in!",
      description: `Welcome to the raffle, ${values.name} ${values.lastName}!`,
    });
    
    // You can redirect or show a success message.
    // For now, we'll just show a toast.
    form.reset();
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
                <Button type="submit" className="w-full">Join Raffle</Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </main>
  );
}

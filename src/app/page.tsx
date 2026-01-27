import Link from "next/link";
import { QrCode, Ticket } from "lucide-react";
import { UserProfile } from "../components/auth/user-profile";

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background text-foreground">
            <main className="max-w-2xl w-full space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">QR Tools</h1>
                    <p className="text-muted-foreground text-lg">
                        Select a tool to get started
                    </p>
                </div>

                <div className="absolute top-4 right-4">
                    <UserProfile />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link
                        href="/raffle"
                        className="group relative flex flex-col items-center justify-center p-8 h-64 bg-card rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-border hover:-translate-y-1"
                    >
                        <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                            <Ticket className="w-12 h-12 text-primary" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">Raffle</h2>
                        <p className="text-center text-muted-foreground">
                            Run a raffle with QR code scanning
                        </p>
                    </Link>

                    <Link
                        href="/qr-ref"
                        className="group relative flex flex-col items-center justify-center p-8 h-64 bg-card rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-border hover:-translate-y-1"
                    >
                        <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                            <QrCode className="w-12 h-12 text-primary" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">QR Reference</h2>
                        <p className="text-center text-muted-foreground">
                            Generate and manage reference QR codes
                        </p>
                    </Link>
                </div>
            </main>

            <footer className="mt-16 text-sm text-muted-foreground">
                © {new Date().getFullYear()} QR Tools
            </footer>
        </div>
    );
}

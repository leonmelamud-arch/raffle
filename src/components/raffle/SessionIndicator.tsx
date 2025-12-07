'use client';

import { useSessionContext } from '@/context/SessionContext';
import { useQrModal } from '@/context/QrModalContext';
import { Button } from '@/components/ui/button';
import { RefreshCw, Copy, Check, QrCode, X, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { Input } from '@/components/ui/input';

export function SessionIndicator() {
    const { sessionId, loading, startNewSession, switchToSession } = useSessionContext();
    const { showQrModal, closeQrModal, openQrModal } = useQrModal();
    const [isCreating, setIsCreating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showSwitchDialog, setShowSwitchDialog] = useState(false);
    const [switchSessionId, setSwitchSessionId] = useState('');
    const [isSwitching, setIsSwitching] = useState(false);
    const { toast } = useToast();

    const handleNewSessionClick = () => {
        setShowConfirmDialog(true);
    };

    const handleConfirmNewSession = async () => {
        // Copy current session ID first for safety
        if (sessionId) {
            await navigator.clipboard.writeText(sessionId);
            toast({
                title: 'Session Saved!',
                description: `Your current session ID (${sessionId.substring(0, 8).toUpperCase()}) has been copied. Create the new session now.`,
            });
        }

        setShowConfirmDialog(false);
        setIsCreating(true);
        await startNewSession();
        setIsCreating(false);
        toast({
            title: 'New Session Started',
            description: 'A fresh raffle session has been created.',
        });
    };

    const handleCancelNewSession = () => {
        setShowConfirmDialog(false);
    };

    const handleSwitchSession = async () => {
        if (!switchSessionId.trim()) {
            toast({
                title: 'Invalid Session',
                description: 'Please enter a session ID.',
                variant: 'destructive',
            });
            return;
        }

        setIsSwitching(true);
        const success = await switchToSession(switchSessionId.trim());
        setIsSwitching(false);

        if (success) {
            setShowSwitchDialog(false);
            setSwitchSessionId('');
            toast({
                title: 'Session Switched',
                description: 'You are now viewing the selected session.',
            });
        } else {
            toast({
                title: 'Session Not Found',
                description: 'Could not find a session with that ID. Please check and try again.',
                variant: 'destructive',
            });
        }
    };

    const handleCopyId = async () => {
        if (!sessionId) return;

        try {
            await navigator.clipboard.writeText(sessionId);
            setCopied(true);
            toast({
                title: 'Session ID Copied',
                description: 'Save this ID to return to this session later.',
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const getJoinUrl = () => {
        if (typeof window === 'undefined' || !sessionId) return '';
        return `${window.location.origin}/qr?session=${sessionId}`;
    };

    // Format session ID for display (first 8 characters)
    const displayId = sessionId ? sessionId.substring(0, 8).toUpperCase() : '...';

    return (
        <>
            {/* Session Indicator Badge */}
            <div className="fixed left-4 top-20 z-40 flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 shadow-lg">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        Session
                    </span>
                    <button
                        onClick={handleCopyId}
                        disabled={loading || !sessionId}
                        className="text-xs font-mono font-bold text-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
                        title="Click to copy full session ID"
                    >
                        {loading ? '...' : displayId}
                        {copied ? (
                            <Check className="h-3 w-3 text-green-500" />
                        ) : (
                            <Copy className="h-3 w-3 opacity-50 hover:opacity-100" />
                        )}
                    </button>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={openQrModal}
                    disabled={loading || !sessionId}
                    className="h-8 w-8 p-0"
                    title="Show QR Code"
                >
                    <QrCode className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSwitchDialog(true)}
                    disabled={loading}
                    className="h-8 w-8 p-0"
                    title="Switch to Another Session"
                >
                    <KeyRound className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewSessionClick}
                    disabled={loading || isCreating}
                    className="h-8 w-8 p-0"
                    title="Start New Session"
                >
                    <RefreshCw className={`h-4 w-4 ${isCreating ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Confirmation Dialog for New Session */}
            {showConfirmDialog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={handleCancelNewSession}
                >
                    <div
                        className="bg-card rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-card-foreground mb-2">
                            Start New Session?
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4">
                            You are about to create a new raffle session. Your current session ID will be copied to clipboard so you can return later.
                        </p>
                        <div className="bg-muted/50 rounded-lg p-3 mb-4">
                            <p className="text-xs text-muted-foreground">Current Session ID:</p>
                            <p className="font-mono font-bold text-primary">{displayId}</p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleCancelNewSession}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleConfirmNewSession}
                            >
                                Create New
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Switch Session Dialog */}
            {showSwitchDialog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowSwitchDialog(false)}
                >
                    <div
                        className="bg-card rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowSwitchDialog(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-xl font-bold text-card-foreground mb-2">
                            Switch Session
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4">
                            Enter a session ID to switch to a previous raffle session.
                        </p>

                        <Input
                            placeholder="Enter session ID..."
                            value={switchSessionId}
                            onChange={(e) => setSwitchSessionId(e.target.value)}
                            className="mb-4 font-mono"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSwitchSession();
                            }}
                        />

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowSwitchDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleSwitchSession}
                                disabled={isSwitching || !switchSessionId.trim()}
                            >
                                {isSwitching ? 'Switching...' : 'Switch'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQrModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={closeQrModal}
                >
                    <div
                        className="bg-card rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={closeQrModal}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-card-foreground mb-2">
                                Join the Raffle
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                Scan this QR code to join session
                            </p>
                            <p className="text-primary font-mono font-bold mt-1">
                                {displayId}
                            </p>
                        </div>

                        <div className="flex justify-center mb-6">
                            <div className="bg-white p-4 rounded-xl">
                                <QRCodeSVG
                                    value={getJoinUrl()}
                                    size={256}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-xs text-muted-foreground break-all">
                                {getJoinUrl()}
                            </p>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="mt-4"
                                onClick={async () => {
                                    await navigator.clipboard.writeText(getJoinUrl());
                                    toast({
                                        title: 'Link Copied!',
                                        description: 'Share this link with participants.',
                                    });
                                }}
                            >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Link
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

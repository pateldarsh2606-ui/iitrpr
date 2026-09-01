'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface MatchModalProps {
  open: boolean;
  onClose: () => void;
  matchName: string;
  onChat?: () => void;
}

export function MatchModal({ open, onClose, matchName, onChat }: MatchModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm overflow-hidden border-primary/30 bg-card p-0">
        <div className="relative flex flex-col items-center px-8 py-12 text-center">
          {/* Glow background */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-accent/5 to-transparent" />
          <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl animate-pulse-glow" />

          <div className="relative z-10">
            {/* Heart icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40 animate-scale-in">
              <Heart className="h-10 w-10 text-white" fill="white" />
            </div>

            <h2 className="font-display text-3xl font-bold text-gradient-romantic animate-fade-in-up">
              It's a Match!
            </h2>
            <p className="mt-3 text-lg text-foreground animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              You and <span className="font-semibold text-primary">{matchName}</span> picked each other.
            </p>
            <p className="mt-2 text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              You can now start chatting privately.
            </p>

            <div className="mt-8 flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              {onChat && (
                <Button
                  onClick={() => { onChat(); onClose(); }}
                  className="h-11 rounded-full bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/25 hover:brightness-110"
                >
                  Start Chatting
                </Button>
              )}
              <Button variant="ghost" onClick={onClose} className="rounded-full text-muted-foreground">
                Keep browsing
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

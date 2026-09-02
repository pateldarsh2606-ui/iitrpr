'use client';

import { useState } from 'react';
import { Heart, Loader2, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';

interface MatchModalProps {
  open: boolean;
  onClose: () => void;
  matchName: string;
  onChat?: () => void;
}

export function MatchModal({ open, onClose, matchName, onChat }: MatchModalProps) {
  const { profile } = useAuth();
  const [unmatching, setUnmatching] = useState(false);
  const [unmatchError, setUnmatchError] = useState<string | null>(null);

  const handleUnmatch = async () => {
    if (!profile || unmatching) return;
    const confirmed = window.confirm(
      `Unmatch ${matchName}? Your match and entire chat will be permanently deleted for both of you.`
    );
    if (!confirmed) return;

    setUnmatching(true);
    setUnmatchError(null);

    // Find the match by the other person's name, then use the actual match id
    // so this works for matches created through Secret Crushes or Crush Requests.
    const { data: possibleProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('full_name', matchName)
      .neq('id', profile.id);

    if (profileError || !possibleProfiles?.length) {
      setUnmatchError('Could not find this match. Please try again from Matches.');
      setUnmatching(false);
      return;
    }

    const candidateIds = possibleProfiles.map((p) => p.id);
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('id, user_a, user_b')
      .or(`user_a.eq.${profile.id},user_b.eq.${profile.id}`);

    const match = (matchData as { id: string; user_a: string; user_b: string }[] | null)?.find((m) => {
      const otherId = m.user_a === profile.id ? m.user_b : m.user_a;
      return candidateIds.includes(otherId);
    });

    if (matchError || !match) {
      setUnmatchError('This match may already have been removed. Please refresh and try again.');
      setUnmatching(false);
      return;
    }

    const { data, error } = await supabase.rpc('unmatch_match', { p_match_id: match.id });
    if (error || data !== true) {
      setUnmatchError('Could not unmatch right now. Please try again.');
      setUnmatching(false);
      return;
    }

    onClose();
    setUnmatching(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm overflow-hidden border-primary/30 bg-card p-0">
        <div className="relative flex flex-col items-center px-8 py-12 text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-accent/5 to-transparent" />
          <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl animate-pulse-glow" />

          <div className="relative z-10 w-full">
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
              <Button
                variant="outline"
                onClick={handleUnmatch}
                disabled={unmatching}
                className="h-11 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {unmatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                {unmatching ? 'Removing match...' : 'Unmatch & delete chat'}
              </Button>
              {unmatchError && <p className="text-xs text-destructive">{unmatchError}</p>}
              <Button variant="ghost" onClick={onClose} disabled={unmatching} className="rounded-full text-muted-foreground">
                Keep browsing
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

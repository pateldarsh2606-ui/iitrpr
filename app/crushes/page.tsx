'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Heart, Loader2, Check, X, Sparkles, UserCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { AppNav, AuthGate } from '@/components/app-nav';
import { MatchModal } from '@/components/match-modal';
import { ConfettiOverlay, useConfetti } from '@/components/confetti';
import type { Profile, Crush } from '@/lib/types';
import { MAX_CRUSHES } from '@/lib/types';
import { Button } from '@/components/ui/button';

function Crushes() {
  const { profile } = useAuth();
  const router = useRouter();
  const { pieces, active, fire } = useConfetti();
  const [students, setStudents] = useState<Profile[]>([]);
  const [crushes, setCrushes] = useState<Crush[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [matchModal, setMatchModal] = useState<{ name: string } | null>(null);

  const loadStudents = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setStudents(data as Profile[]);
  }, []);

  const loadCrushes = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('crushes')
      .select('*')
      .eq('chooser_id', profile.id);
    if (!error && data) setCrushes(data as Crush[]);
  }, [profile]);

  useEffect(() => {
    (async () => {
      await loadStudents();
      await loadCrushes();
      setLoading(false);
    })();
  }, [loadStudents, loadCrushes]);

  // Real-time: listen for new matches involving this user
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('match-detection')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
        },
        async (payload) => {
          const newMatch = payload.new as { user_a: string; user_b: string };
          if (newMatch.user_a === profile.id || newMatch.user_b === profile.id) {
            const otherId = newMatch.user_a === profile.id ? newMatch.user_b : newMatch.user_a;
            const { data: otherProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', otherId)
              .maybeSingle();
            if (otherProfile) {
              fire();
              setMatchModal({ name: (otherProfile as Profile).full_name });
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, fire]);

  const selectedIds = useMemo(() => new Set(crushes.map((c) => c.crush_id)), [crushes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (s.id === profile?.id) return false;
      if (!q) return true;
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.entry_number.toLowerCase().includes(q)
      );
    });
  }, [students, search, profile]);

  const toggleCrush = async (studentId: string) => {
    if (!profile) return;
    const existing = crushes.find((c) => c.crush_id === studentId);
    if (existing) {
      const { error } = await supabase.from('crushes').delete().eq('id', existing.id);
      if (!error) setCrushes(crushes.filter((c) => c.id !== existing.id));
    } else {
      if (crushes.length >= MAX_CRUSHES) return;
      const { data, error } = await supabase
        .from('crushes')
        .insert({ chooser_id: profile.id, crush_id: studentId })
        .select()
        .single();
      if (!error && data) {
        setCrushes([...crushes, data as Crush]);
        // Match detection is handled by the realtime subscription on the matches table.
        // Check immediately if the reverse crush already exists (the trigger may have
        // just created a match before the realtime event arrives).
        const { data: reverseCrush } = await supabase
          .from('crushes')
          .select('id')
          .eq('chooser_id', studentId)
          .eq('crush_id', profile.id)
          .maybeSingle();
        if (reverseCrush) {
          const { data: matchCheck } = await supabase
            .from('matches')
            .select('id')
            .or(`user_a.eq.${profile.id},user_b.eq.${profile.id}`)
            .limit(1);
          if (matchCheck && matchCheck.length > 0) {
            const { data: otherProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', studentId)
              .maybeSingle();
            if (otherProfile) {
              fire();
              setMatchModal({ name: (otherProfile as Profile).full_name });
            }
          }
        }
      }
    }
  };

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const remaining = MAX_CRUSHES - crushes.length;

  return (
    <div className="min-h-screen bg-romantic-glow pb-20 sm:pb-0">
      <AppNav />
      <ConfettiOverlay pieces={pieces} active={active} />
      {matchModal && (
        <MatchModal
          open={!!matchModal}
          onClose={() => setMatchModal(null)}
          matchName={matchModal.name}
          onChat={() => router.push('/matches')}
        />
      )}

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Secret Crushes</h1>
          <p className="mt-2 text-muted-foreground">
            Pick up to {MAX_CRUSHES} people. Your choices are completely private — nobody sees them unless they pick you back.
          </p>
        </div>

        {/* Selection counter */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card/50 p-4 backdrop-blur-md">
          <div className="flex gap-1.5">
            {Array.from({ length: MAX_CRUSHES }).map((_, i) => (
              <div
                key={i}
                className={`h-3 w-12 rounded-full transition ${i < crushes.length ? 'bg-gradient-to-r from-primary to-accent' : 'bg-secondary'}`}
              />
            ))}
          </div>
          <span className="text-sm font-medium">
            {crushes.length}/{MAX_CRUSHES} selected
            {remaining > 0 && <span className="text-muted-foreground ml-1">· {remaining} left</span>}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="h-12 w-full rounded-full border border-border bg-card/50 pl-12 pr-4 text-sm backdrop-blur-md outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <UserCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No students found.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((student, idx) => {
              const selected = selectedIds.has(student.id);
              const disabled = !selected && crushes.length >= MAX_CRUSHES;
              return (
                <div
                  key={student.id}
                  className={`glass-card relative rounded-2xl border p-5 transition animate-fade-in-up ${
                    selected
                      ? 'border-primary/50 shadow-lg shadow-primary/10'
                      : disabled
                      ? 'border-border opacity-50'
                      : 'border-border hover:border-primary/30'
                  }`}
                  style={{ animationDelay: `${Math.min(idx * 0.03, 0.5)}s` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-semibold text-primary">
                        {initials(student.full_name)}
                      </div>
                      {selected && (
                        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent ring-2 ring-background">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{student.full_name}</h3>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{student.department}</p>
                      <p className="text-sm text-muted-foreground">{student.entry_number}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => toggleCrush(student.id)}
                    disabled={disabled}
                    className={`mt-4 w-full h-10 rounded-full text-sm font-medium transition ${
                      selected
                        ? 'bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive'
                        : 'bg-gradient-to-r from-primary to-accent text-white hover:brightness-110'
                    }`}
                  >
                    {selected ? (
                      <>
                        <X className="h-4 w-4" />
                        Remove crush
                      </>
                    ) : (
                      <>
                        <Heart className="h-4 w-4" />
                        Pick as crush
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {crushes.length === MAX_CRUSHES && (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            You've picked all {MAX_CRUSHES} crushes. Now sit back and wait for a match!
          </div>
        )}
      </div>
    </div>
  );
}

export default function CrushesPage() {
  return (
    <AuthGate>
      <Crushes />
    </AuthGate>
  );
}

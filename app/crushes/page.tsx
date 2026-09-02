'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Heart, Loader2, Check, X, Sparkles, UserCircle, Send, Inbox } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { AppNav, AuthGate } from '@/components/app-nav';
import { MatchModal } from '@/components/match-modal';
import { ConfettiOverlay, useConfetti } from '@/components/confetti';
import type { Profile, Crush, CrushRequest } from '@/lib/types';
import { MAX_CRUSHES } from '@/lib/types';
import { Button } from '@/components/ui/button';

function Crushes() {
  const { profile } = useAuth();
  const router = useRouter();
  const { pieces, active, fire } = useConfetti();
  const [students, setStudents] = useState<Profile[]>([]);
  const [crushes, setCrushes] = useState<Crush[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<CrushRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<CrushRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestBusy, setRequestBusy] = useState<string | null>(null);
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

  const loadRequests = useCallback(async () => {
    if (!profile) return;
    const [incoming, outgoing] = await Promise.all([
      supabase.from('crush_requests').select('*').eq('recipient_id', profile.id).eq('status', 'pending'),
      supabase.from('crush_requests').select('*').eq('sender_id', profile.id),
    ]);
    if (!incoming.error && incoming.data) setIncomingRequests(incoming.data as CrushRequest[]);
    if (!outgoing.error && outgoing.data) setOutgoingRequests(outgoing.data as CrushRequest[]);
  }, [profile]);

  useEffect(() => {
    (async () => {
      await Promise.all([loadStudents(), loadCrushes(), loadRequests()]);
      setLoading(false);
    })();
  }, [loadStudents, loadCrushes, loadRequests]);

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('match-detection')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, async (payload) => {
        const newMatch = payload.new as { user_a: string; user_b: string };
        if (newMatch.user_a === profile.id || newMatch.user_b === profile.id) {
          const otherId = newMatch.user_a === profile.id ? newMatch.user_b : newMatch.user_a;
          const { data: otherProfile } = await supabase.from('profiles').select('full_name').eq('id', otherId).maybeSingle();
          if (otherProfile) {
            fire();
            setMatchModal({ name: otherProfile.full_name });
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, fire]);

  const selectedIds = useMemo(() => new Set(crushes.map((c) => c.crush_id)), [crushes]);
  const outgoingByRecipient = useMemo(() => new Map(outgoingRequests.map((r) => [r.recipient_id, r])), [outgoingRequests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (s.id === profile?.id) return false;
      if (!q) return true;
      return s.full_name.toLowerCase().includes(q) || s.department.toLowerCase().includes(q) || s.entry_number.toLowerCase().includes(q) || (s.interests || []).some((i) => i.toLowerCase().includes(q));
    });
  }, [students, search, profile]);

  const toggleCrush = async (studentId: string) => {
    if (!profile) return;
    const existing = crushes.find((c) => c.crush_id === studentId);
    if (existing) {
      const { error } = await supabase.from('crushes').delete().eq('id', existing.id);
      if (!error) setCrushes((current) => current.filter((c) => c.id !== existing.id));
      return;
    }
    if (crushes.length >= MAX_CRUSHES) return;
    const { data, error } = await supabase.from('crushes').insert({ chooser_id: profile.id, crush_id: studentId }).select().single();
    if (!error && data) setCrushes((current) => [...current, data as Crush]);
  };

  const sendRequest = async (studentId: string) => {
    if (!profile || requestBusy) return;
    setRequestBusy(studentId);
    const existing = outgoingByRecipient.get(studentId);
    let error = null;

    if (existing) {
      if (existing.status === 'pending') {
        setRequestBusy(null);
        return;
      }
      const deleted = await supabase.from('crush_requests').delete().eq('id', existing.id);
      error = deleted.error;
    }

    if (!error) {
      const result = await supabase.from('crush_requests').insert({ sender_id: profile.id, recipient_id: studentId }).select().single();
      error = result.error;
    }

    if (!error) await loadRequests();
    setRequestBusy(null);
  };

  const respondToRequest = async (request: CrushRequest, status: 'accepted' | 'declined') => {
    setRequestBusy(request.id);
    const { error } = await supabase.from('crush_requests').update({ status, responded_at: new Date().toISOString() }).eq('id', request.id);
    if (!error) await loadRequests();
    setRequestBusy(null);
  };

  const initials = (name: string) => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const remaining = MAX_CRUSHES - crushes.length;

  return (
    <div className="min-h-screen bg-romantic-glow pb-20 sm:pb-0">
      <AppNav />
      <ConfettiOverlay pieces={pieces} active={active} />
      {matchModal && <MatchModal open={!!matchModal} onClose={() => setMatchModal(null)} matchName={matchModal.name} onChat={() => router.push('/matches')} />}

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Crushes</h1>
          <p className="mt-2 text-muted-foreground">Choose privately with Secret Crushes, or make your interest known with a Crush Request.</p>
        </div>

        {incomingRequests.length > 0 && (
          <section className="mb-8 rounded-2xl border border-primary/20 bg-card/60 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Crush Requests</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{incomingRequests.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {incomingRequests.map((request) => {
                const sender = students.find((s) => s.id === request.sender_id);
                if (!sender) return null;
                return (
                  <div key={request.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{initials(sender.full_name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{sender.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{sender.department}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respondToRequest(request, 'accepted')} disabled={requestBusy === request.id}><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => respondToRequest(request, 'declined')} disabled={requestBusy === request.id}><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-8 rounded-2xl border border-border bg-card/50 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Secret Crush</h2></div>
              <p className="mt-1 text-sm text-muted-foreground">Pick up to {MAX_CRUSHES}. Nobody can see your choices unless they pick you too.</p>
            </div>
            <div className="text-sm font-medium">{crushes.length}/{MAX_CRUSHES} selected · {remaining} left</div>
          </div>
          <div className="mt-4 flex gap-1.5">{Array.from({ length: MAX_CRUSHES }).map((_, i) => <div key={i} className={`h-2 flex-1 rounded-full ${i < crushes.length ? 'bg-gradient-to-r from-primary to-accent' : 'bg-secondary'}`} />)}</div>
        </section>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students..." className="h-12 w-full rounded-full border border-border bg-card/50 pl-12 pr-4 text-sm backdrop-blur-md outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center"><UserCircle className="mb-4 h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">No students found.</p></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((student, idx) => {
              const selected = selectedIds.has(student.id);
              const disabled = !selected && crushes.length >= MAX_CRUSHES;
              const request = outgoingByRecipient.get(student.id);
              return (
                <div key={student.id} className={`glass-card rounded-2xl border p-5 transition animate-fade-in-up ${selected ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border hover:border-primary/30'}`} style={{ animationDelay: `${Math.min(idx * 0.03, 0.5)}s` }}>
                  <div className="flex items-start gap-4">
                    <div className="relative"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-semibold text-primary">{initials(student.full_name)}</div>{selected && <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent ring-2 ring-background"><Check className="h-3.5 w-3.5 text-white" /></div>}</div>
                    <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{student.full_name}</h3><p className="mt-1 truncate text-sm text-muted-foreground">{student.department}</p><div className="mt-1 flex flex-wrap gap-1">{(student.interests || []).slice(0, 2).map((interest) => <span key={interest} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{interest}</span>)}</div></div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Button onClick={() => toggleCrush(student.id)} disabled={disabled} className={`h-10 rounded-full text-xs font-medium ${selected ? 'bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive' : 'bg-gradient-to-r from-primary to-accent text-white hover:brightness-110'}`}>
                      {selected ? <><X className="h-4 w-4" /> Remove</> : <><Heart className="h-4 w-4" /> Secret Crush</>}
                    </Button>
                    <Button variant="outline" onClick={() => sendRequest(student.id)} disabled={requestBusy === student.id || request?.status === 'pending'} className="h-10 rounded-full text-xs">
                      {request?.status === 'pending' ? <><Check className="h-4 w-4" /> Sent</> : <><Send className="h-4 w-4" /> Request</>}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {crushes.length === MAX_CRUSHES && <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center text-sm text-primary"><Sparkles className="h-4 w-4" /> You've picked all {MAX_CRUSHES} secret crushes. Now sit back and wait for a match!</div>}
      </div>
    </div>
  );
}

export default function CrushesPage() {
  return <AuthGate><Crushes /></AuthGate>;
}

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send, Loader2, ArrowLeft, Heart, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { AppNav, AuthGate } from '@/components/app-nav';
import type { Match, Message, Profile } from '@/lib/types';

interface MatchWithOther extends Match {
  other: Profile;
}

function Matches() {
  const { profile } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchWithOther[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMatches = useCallback(async () => {
    if (!profile) return;
    const { data: matchData, error } = await supabase
      .from('matches')
      .select('*')
      .or(`user_a.eq.${profile.id},user_b.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    if (error || !matchData || matchData.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const otherIds = matchData.map((m: Match) =>
      m.user_a === profile.id ? m.user_b : m.user_a
    );
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', otherIds);

    const profileMap = new Map<string, Profile>();
    (profileData as Profile[] | null)?.forEach((p) => profileMap.set(p.id, p));

    const enriched: MatchWithOther[] = (matchData as Match[]).map((m) => ({
      ...m,
      other: profileMap.get(m.user_a === profile.id ? m.user_b : m.user_a)!,
    })).filter((m) => m.other);

    setMatches(enriched);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // Real-time: listen for new matches and match cancellations
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('matches-list')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        () => loadMatches()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'matches' },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setMatches((prev) => prev.filter((m) => m.id !== deletedId));
          if (activeMatchId === deletedId) {
            setActiveMatchId(null);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, loadMatches, activeMatchId]);

  const activeMatch = matches.find((m) => m.id === activeMatchId);

  const loadMessages = useCallback(async () => {
    if (!activeMatchId) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', activeMatchId)
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data as Message[]);
  }, [activeMatchId]);

  useEffect(() => {
    if (activeMatchId) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [activeMatchId, loadMessages]);

  // Real-time messages
  useEffect(() => {
    if (!activeMatchId) return;
    const channel = supabase
      .channel(`messages-${activeMatchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${activeMatchId}` },
        (payload) => {
          setMessages((prev) => {
            const newMsg = payload.new as Message;
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeMatchId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeMatchId || !profile) return;
    setSending(true);
    setSendError(null);
    const content = newMessage.trim();
    setNewMessage('');
    const { data, error } = await supabase
      .from('messages')
      .insert({ match_id: activeMatchId, sender_id: profile.id, content })
      .select()
      .single();
    if (error) {
      setNewMessage(content);
      setSendError('Failed to send. Tap to try again.');
    } else {
      setSendError(null);
      setMessages((prev) => [...prev, data as Message]);
    }
    setSending(false);
  };

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Mobile: if a chat is open, show chat full-screen
  const showChatMobile = activeMatchId !== null;

  return (
    <div className="min-h-screen bg-romantic-glow pb-20 sm:pb-0">
      <AppNav />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 hidden sm:block">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Your Matches</h1>
          <p className="mt-2 text-muted-foreground">
            Chat privately with your mutual matches. No match, no access.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-semibold">No matches yet</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              When someone you picked also picks you, they'll appear here and you can start chatting.
            </p>
            <button
              onClick={() => router.push('/crushes')}
              className="mt-6 flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-6 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:brightness-110"
            >
              <Heart className="h-4 w-4" fill="currentColor" />
              Pick your crushes
            </button>
          </div>
        ) : (
          <div className="flex h-[calc(100vh-8rem)] sm:h-[calc(100vh-10rem)] overflow-hidden rounded-2xl border border-border bg-card/30 backdrop-blur-md">
            {/* Match list */}
            <div className={`${showChatMobile ? 'hidden' : 'flex'} w-full flex-col border-r border-border sm:w-80 sm:flex`}>
              <div className="border-b border-border px-4 py-3 sm:hidden">
                <h1 className="font-display text-xl font-bold">Matches</h1>
              </div>
              <div className="flex-1 overflow-y-auto">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveMatchId(m.id)}
                    className={`flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left transition hover:bg-secondary/50 ${
                      activeMatchId === m.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 font-semibold text-primary">
                      {initials(m.other.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.other.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.other.department}</p>
                    </div>
                    <Heart className="h-4 w-4 text-primary shrink-0" fill="currentColor" />
                  </button>
                ))}
              </div>
            </div>

            {/* Chat panel */}
            <div className={`${showChatMobile ? 'flex' : 'hidden'} flex-1 flex-col`}>
              {activeMatch ? (
                <>
                  {/* Chat header */}
                  <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                    <button
                      onClick={() => setActiveMatchId(null)}
                      className="sm:hidden flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 font-semibold text-primary">
                      {initials(activeMatch.other.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{activeMatch.other.full_name}</p>
                      <p className="flex items-center gap-1 text-xs text-primary">
                        <Heart className="h-3 w-3" fill="currentColor" />
                        Mutual match
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                        <MessageCircle className="mb-3 h-10 w-10 opacity-50" />
                        <p className="text-sm">Say hi to {activeMatch.other.full_name.split(' ')[0]}!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.sender_id === profile?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                                isMe
                                  ? 'bg-gradient-to-br from-primary to-accent text-white rounded-br-sm'
                                  : 'bg-secondary text-foreground rounded-bl-sm'
                              }`}
                            >
                              <p className="break-words">{msg.content}</p>
                              <p className={`mt-1 text-xs ${isMe ? 'text-white/70' : 'text-muted-foreground'}`}>
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t border-border p-3">
                    {sendError && (
                      <p className="mb-2 px-2 text-xs text-destructive">{sendError}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Type a message..."
                        className="flex-1 h-11 rounded-full border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="hidden flex-1 flex-col items-center justify-center text-center text-muted-foreground sm:flex">
                  <MessageCircle className="mb-3 h-12 w-12 opacity-50" />
                  <p>Select a match to start chatting</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MatchesPage() {
  return (
    <AuthGate>
      <Matches />
    </AuthGate>
  );
}

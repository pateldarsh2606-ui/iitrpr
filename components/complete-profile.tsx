'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, User, Building2, Hash, Loader2, AlertCircle, Music, Film, Sparkles, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { DEPARTMENTS, VIBES } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CompleteProfile() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [entryNumber, setEntryNumber] = useState('');
  const [favoriteMusic, setFavoriteMusic] = useState('');
  const [favoriteMovie, setFavoriteMovie] = useState('');
  const [interests, setInterests] = useState('');
  const [vibe, setVibe] = useState<string>('');
  const [idealProm, setIdealProm] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.user_metadata) {
      const meta = user.user_metadata as Record<string, string>;
      if (meta.full_name) setFullName(meta.full_name);
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !entryNumber.trim()) {
      setError('Please fill in your name and entry number.');
      return;
    }
    if (!user) {
      setError('Your session has expired. Please sign in again.');
      return;
    }
    setLoading(true);
    try {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName.trim(),
        department,
        entry_number: entryNumber.trim().toUpperCase(),
        bio: bio.trim() || null,
        favorite_music: favoriteMusic.trim() || null,
        favorite_movie: favoriteMovie.trim() || null,
        interests: interests.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 8),
        vibe: vibe || null,
        ideal_prom: idealProm.trim() || null,
      }, { onConflict: 'id' });
      if (profileError) throw profileError;
      await refreshProfile();
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' ? err.message : 'Failed to save profile';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-romantic-glow">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute bottom-0 -right-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="glass-card rounded-3xl border border-border p-8 shadow-2xl">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30"><Heart className="h-7 w-7 text-white" fill="white" /></div>
              <h1 className="font-display text-2xl font-bold">Build your Prom profile ✨</h1>
              <p className="mt-1 text-sm text-muted-foreground">The fun stuff helps people find something to talk about.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="name">Full Name *</Label><div className="relative"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Aarav Sharma" className="pl-10" /></div></div>
                <div className="space-y-2"><Label htmlFor="entry">Entry Number *</Label><div className="relative"><Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="entry" value={entryNumber} onChange={(e) => setEntryNumber(e.target.value)} placeholder="2023CSB107" className="pl-10" /></div></div>
              </div>
              <div className="space-y-2"><Label htmlFor="dept">Department</Label><div className="relative"><Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" /><select id="dept" value={department} onChange={(e) => setDepartment(e.target.value)} className="flex h-10 w-full appearance-none rounded-md border border-input bg-background pl-10 pr-3 text-sm"><option value="">Select department</option>{DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}</select></div></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="music">Favorite music</Label><div className="relative"><Music className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="music" value={favoriteMusic} onChange={(e) => setFavoriteMusic(e.target.value)} placeholder="Artists / genres" className="pl-10" /></div></div>
                <div className="space-y-2"><Label htmlFor="movie">Favorite movie</Label><div className="relative"><Film className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="movie" value={favoriteMovie} onChange={(e) => setFavoriteMovie(e.target.value)} placeholder="A movie you love" className="pl-10" /></div></div>
              </div>
              <div className="space-y-2"><Label htmlFor="interests">Interests</Label><Input id="interests" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Football, coding, gaming, movies" /><p className="text-xs text-muted-foreground">Separate with commas · up to 8</p></div>
              <div className="space-y-2"><Label htmlFor="vibe"><Sparkles className="mr-1 inline h-4 w-4" />My vibe</Label><select id="vibe" value={vibe} onChange={(e) => setVibe(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose a vibe</option>{VIBES.map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="ideal">Ideal Prom night</Label><Input id="ideal" value={idealProm} onChange={(e) => setIdealProm(e.target.value)} placeholder="Good music + friends + zero awkward dancing 😭" /></div>
              <div className="space-y-2"><Label htmlFor="bio"><MessageCircle className="mr-1 inline h-4 w-4" />About me</Label><textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={240} placeholder="A little something about you..." className="min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /><p className="text-right text-xs text-muted-foreground">{bio.length}/240</p></div>
              {error && <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
              <Button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/25 hover:brightness-110">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save profile & enter PromMatch ✨'}</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

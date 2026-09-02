'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search, Heart, Loader2, Building2, UserCircle, Music, Film, Sparkles, MessageCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { AppNav, AuthGate } from '@/components/app-nav';
import type { Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';

function StudentCard({ student, mine, onView }: { student: Profile; mine: boolean; onView: () => void }) {
  const initials = student.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="glass-card group rounded-2xl border border-border p-5 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-semibold text-primary">{initials}</div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{student.full_name}{mine && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">You</span>}</h3>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground"><Building2 className="h-3.5 w-3.5" />{student.department}</p>
          {!mine && student.vibe && <p className="mt-1 flex items-center gap-1.5 text-xs text-primary"><Sparkles className="h-3 w-3" />{student.vibe}</p>}
        </div>
      </div>
      {!mine && student.interests && student.interests.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{student.interests.slice(0, 3).map((x) => <span key={x} className="rounded-full bg-secondary px-2.5 py-1 text-xs">{x}</span>)}</div>}
      <Button onClick={onView} variant="secondary" className="mt-4 w-full rounded-full">View profile</Button>
    </div>
  );
}

function ProfileModal({ student, onClose }: { student: Profile; onClose: () => void }) {
  const initials = student.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="glass-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border p-7 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between"><div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-xl font-semibold text-primary">{initials}</div><div><h2 className="font-display text-2xl font-bold">{student.full_name}</h2><p className="text-sm text-muted-foreground">{student.department}</p></div></div><button onClick={onClose} className="rounded-full p-2 hover:bg-secondary"><X className="h-5 w-5" /></button></div>
        {student.bio && <div className="mt-6 rounded-2xl bg-secondary/50 p-4"><p className="text-sm">{student.bio}</p></div>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {student.favorite_music && <div className="rounded-2xl border border-border p-4"><Music className="mb-2 h-5 w-5 text-primary" /><p className="text-xs text-muted-foreground">Favorite music</p><p className="mt-1 text-sm font-medium">{student.favorite_music}</p></div>}
          {student.favorite_movie && <div className="rounded-2xl border border-border p-4"><Film className="mb-2 h-5 w-5 text-primary" /><p className="text-xs text-muted-foreground">Favorite movie</p><p className="mt-1 text-sm font-medium">{student.favorite_movie}</p></div>}
        </div>
        {student.interests && student.interests.length > 0 && <div className="mt-5"><p className="mb-2 text-sm font-semibold">Interests</p><div className="flex flex-wrap gap-2">{student.interests.map((x) => <span key={x} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs text-primary">{x}</span>)}</div></div>}
        {student.vibe && <div className="mt-5"><p className="text-sm font-semibold">✨ My vibe</p><p className="mt-1 text-sm text-muted-foreground">{student.vibe}</p></div>}
        {student.ideal_prom && <div className="mt-5"><p className="text-sm font-semibold">🌃 Ideal Prom night</p><p className="mt-1 text-sm text-muted-foreground">{student.ideal_prom}</p></div>}
        <Button onClick={onClose} className="mt-7 w-full rounded-full bg-gradient-to-r from-primary to-accent text-white">Close</Button>
      </div>
    </div>
  );
}

function Directory() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error && data) setStudents(data as Profile[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => !q || s.full_name.toLowerCase().includes(q) || s.department.toLowerCase().includes(q) || s.entry_number.toLowerCase().includes(q) || (s.interests || []).some((x) => x.toLowerCase().includes(q)));
  }, [students, search]);

  return (
    <div className="min-h-screen bg-romantic-glow pb-20 sm:pb-0">
      <AppNav />
      {selectedProfile && <ProfileModal student={selectedProfile} onClose={() => setSelectedProfile(null)} />}
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8"><h1 className="font-display text-3xl font-bold sm:text-4xl">Student Directory</h1><p className="mt-2 text-muted-foreground">Meet the people behind the profiles. Find a vibe, find a conversation. ✨</p></div>
        <div className="relative mb-6"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, department, or interest..." className="h-12 w-full rounded-full border border-border bg-card/50 pl-12 pr-4 text-sm backdrop-blur-md outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20" /></div>
        {loading ? <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : filtered.length === 0 ? <div className="flex flex-col items-center justify-center py-24 text-center"><UserCircle className="mb-4 h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">{search ? 'No students found matching your search.' : 'No students registered yet.'}</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((student) => <StudentCard key={student.id} student={student} mine={student.id === profile?.id} onView={() => setSelectedProfile(student)} />)}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() { return <AuthGate><Directory /></AuthGate>; }

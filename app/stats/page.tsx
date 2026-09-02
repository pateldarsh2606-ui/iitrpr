'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Heart, Loader2, Users, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { AppNav, AuthGate } from '@/components/app-nav';

interface StatItem { name: string; count: number; }
interface CampusStats { students: number; matches: number; departments: StatItem[]; vibes: StatItem[]; }

function Stats() {
  const [stats, setStats] = useState<CampusStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('get_campus_stats');
      if (!error && data) setStats(data as CampusStats);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-romantic-glow pb-20 sm:pb-0">
      <AppNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3"><BarChart3 className="h-7 w-7 text-primary" /><h1 className="font-display text-3xl font-bold sm:text-4xl">Campus Stats</h1></div>
          <p className="mt-2 text-muted-foreground">Anonymous, aggregated Prom Match numbers. No individual choices are shown.</p>
        </div>

        {loading ? <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : !stats ? <div className="py-24 text-center text-muted-foreground">Stats are temporarily unavailable.</div> : <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-md"><div className="flex items-center gap-3 text-muted-foreground"><Users className="h-5 w-5" /><span>Students on Prom Match</span></div><p className="mt-3 font-display text-4xl font-bold">{stats.students}</p></div>
            <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-md"><div className="flex items-center gap-3 text-muted-foreground"><Heart className="h-5 w-5 text-primary" /><span>Mutual matches</span></div><p className="mt-3 font-display text-4xl font-bold">{stats.matches}</p></div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-md"><h2 className="font-display text-xl font-semibold">Popular departments</h2><div className="mt-5 space-y-4">{stats.departments.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : stats.departments.map((item) => <div key={item.name}><div className="mb-1 flex justify-between gap-4 text-sm"><span className="truncate">{item.name}</span><span className="font-medium">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${Math.max(8, (item.count / stats.departments[0].count) * 100)}%` }} /></div></div>)}</div></section>
            <section className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-md"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-semibold">Campus vibes</h2></div><div className="mt-5 flex flex-wrap gap-3">{stats.vibes.length === 0 ? <p className="text-sm text-muted-foreground">Vibe data will appear as students complete their profiles.</p> : stats.vibes.map((item) => <div key={item.name} className="rounded-full border border-border bg-secondary/60 px-4 py-2 text-sm"><span className="font-medium">{item.name}</span><span className="ml-2 text-muted-foreground">{item.count}</span></div>)}</div></section>
          </div>
        </>}
      </main>
    </div>
  );
}

export default function StatsPage() { return <AuthGate><Stats /></AuthGate>; }

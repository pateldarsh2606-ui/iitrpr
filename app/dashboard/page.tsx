'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search, Heart, Loader2, Building2, Hash, UserCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { AppNav, AuthGate } from '@/components/app-nav';
import type { Profile } from '@/lib/types';

function Directory() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setStudents(data as Profile[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.entry_number.toLowerCase().includes(q)
    );
  }, [students, search]);

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-romantic-glow pb-20 sm:pb-0">
      <AppNav />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Student Directory</h1>
          <p className="mt-2 text-muted-foreground">
            Browse verified IIT Ropar students. Pick your crushes from the Crushes tab.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, department, or entry number..."
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
            <p className="text-muted-foreground">
              {search ? 'No students found matching your search.' : 'No students registered yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((student, idx) => (
              <div
                key={student.id}
                className="glass-card group rounded-2xl border border-border p-5 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 animate-fade-in-up"
                style={{ animationDelay: `${Math.min(idx * 0.03, 0.5)}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-semibold text-primary">
                    {initials(student.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">
                      {student.full_name}
                      {student.id === profile?.id && (
                        <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">You</span>
                      )}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      {student.department}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      <Hash className="h-3.5 w-3.5 shrink-0" />
                      {student.entry_number}
                    </p>
                  </div>
                </div>
                {student.bio && (
                  <p className="mt-3 text-sm text-muted-foreground/80 line-clamp-2">{student.bio}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <Directory />
    </AuthGate>
  );
}

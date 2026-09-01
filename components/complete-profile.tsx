'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, User, Building2, Hash, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { DEPARTMENTS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CompleteProfile() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [entryNumber, setEntryNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from user metadata saved during sign-up
  useEffect(() => {
    if (user?.user_metadata) {
      const meta = user.user_metadata as Record<string, string>;
      if (meta.full_name) setFullName(meta.full_name);
      if (meta.department && (DEPARTMENTS as readonly string[]).includes(meta.department)) setDepartment(meta.department);
      if (meta.entry_number) setEntryNumber(meta.entry_number);
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !entryNumber.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (!user) {
      setError('Your session has expired. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName.trim(),
          department,
          entry_number: entryNumber.trim().toUpperCase(),
        }, { onConflict: 'id' });
      if (profileError) throw profileError;
      await refreshProfile();
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string'
        ? err.message
        : 'Failed to save profile';
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
        <div className="w-full max-w-md">
          <div className="glass-card rounded-3xl border border-border p-8 shadow-2xl">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
                <Heart className="h-7 w-7 text-white" fill="white" />
              </div>
              <h1 className="font-display text-2xl font-bold">Complete your profile</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Tell us a bit about yourself to join the directory
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aarav Sharma"
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dept">Department</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                  <select
                    id="dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="flex h-10 w-full appearance-none rounded-md border border-input bg-background pl-10 pr-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entry">Entry Number</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="entry"
                    value={entryNumber}
                    onChange={(e) => setEntryNumber(e.target.value)}
                    placeholder="2023CSB107"
                    className="pl-10"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-full bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/25 hover:brightness-110 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Complete Profile'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

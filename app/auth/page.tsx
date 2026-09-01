'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Mail, Lock, User, ArrowLeft, Loader2, AlertCircle, Building2, Hash } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { DEPARTMENTS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@iitrpr\.ac\.in$/;

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [entryNumber, setEntryNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (val: string) => {
    if (!val) return 'Email is required';
    if (!EMAIL_REGEX.test(val)) return 'Only @iitrpr.ac.in emails are allowed';
    return null;
  };

  const isRateLimitError = (msg: string) => {
    const m = msg.toLowerCase();
    return (
      m.includes('rate limit') ||
      m.includes('too many') ||
      m.includes('after 60 seconds') ||
      m.includes('security purposes')
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!fullName.trim() || !entryNumber.trim()) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              department,
              entry_number: entryNumber.trim().toUpperCase(),
            },
          },
        });

        if (signUpError) {
          if (isRateLimitError(signUpError.message)) {
            setError('Too many attempts. Please wait 60 seconds and try again.');
          } else if (signUpError.message.toLowerCase().includes('already registered')) {
            setError('This email is already registered. Try signing in instead.');
          } else {
            throw signUpError;
          }
          setLoading(false);
          return;
        }

        if (data.session && data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: fullName.trim(),
              department,
              entry_number: entryNumber.trim().toUpperCase(),
            }, { onConflict: 'id' });
          if (profileError) throw profileError;
          router.push('/dashboard');
        } else {
          setError('Account created. Please sign in to continue.');
          setMode('signin');
          setLoading(false);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          if (isRateLimitError(signInError.message)) {
            setError('Too many attempts. Please wait 60 seconds and try again.');
          } else {
            setError('Invalid email or password. Please try again.');
          }
          setLoading(false);
          return;
        }
        router.push('/dashboard');
      }
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string'
        ? err.message
        : 'Something went wrong';
      setError(isRateLimitError(message) ? 'Too many attempts. Please wait 60 seconds and try again.' : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-romantic-glow">
      {/* Floating orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute bottom-0 -right-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>

          <div className="glass-card rounded-3xl border border-border p-8 shadow-2xl">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
                <Heart className="h-7 w-7 text-white" fill="white" />
              </div>
              <h1 className="font-display text-2xl font-bold">
                {mode === 'signup' ? 'Join Prom Match' : 'Welcome back'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === 'signup' ? 'Create your account with your IIT Ropar email' : 'Sign in to find your match'}
              </p>
            </div>

            {/* Mode toggle */}
            <div className="mb-6 flex rounded-full border border-border bg-secondary/50 p-1">
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); }}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition ${mode === 'signup' ? 'bg-gradient-to-r from-primary to-accent text-white' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); }}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition ${mode === 'signin' ? 'bg-gradient-to-r from-primary to-accent text-white' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Sign in
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
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
                        autoComplete="name"
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
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">IIT Ropar Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.name@iitrpr.ac.in"
                    className="pl-10"
                    autoComplete="email"
                  />
                </div>
                {email && validateEmail(email) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validateEmail(email)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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
                ) : mode === 'signup' ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Only students with a verified <span className="text-primary font-medium">@iitrpr.ac.in</span> email can join.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

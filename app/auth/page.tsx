'use client';

import { useState, FormEvent, useEffect } from 'react';
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
  const [info, setInfo] = useState<string | null>(null);

  const validateEmail = (value: string) => {
    if (!value) return 'Email is required';
    if (!EMAIL_REGEX.test(value)) return 'Only @iitrpr.ac.in emails are allowed';
    return null;
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);

    const redirectTo = `${window.location.origin}/auth`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleOAuthReturn = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;

      const userEmail = user.email?.toLowerCase() ?? '';
      if (!EMAIL_REGEX.test(userEmail)) {
        await supabase.auth.signOut();
        setError('Please use your IIT Ropar Google account (@iitrpr.ac.in).');
        return;
      }

      router.replace('/dashboard');
    };

    handleOAuthReturn();
  }, [router]);

  const handlePasswordSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      const message = signInError.message.toLowerCase();
      setError(message.includes('rate limit') || message.includes('too many')
        ? 'Too many attempts. Please wait a minute before trying again.'
        : 'Invalid email or password. Please try again.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
    setInfo(null);
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-romantic-glow">
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
                {mode === 'signup' ? 'Use your IIT Ropar Google account to join' : 'Sign in to find your match'}
              </p>
            </div>

            <div className="mb-6 flex rounded-full border border-border bg-secondary/50 p-1">
              <button type="button" onClick={() => switchMode('signup')} className={`flex-1 rounded-full py-2 text-sm font-medium transition ${mode === 'signup' ? 'bg-gradient-to-r from-primary to-accent text-white' : 'text-muted-foreground hover:text-foreground'}`}>Sign up</button>
              <button type="button" onClick={() => switchMode('signin')} className={`flex-1 rounded-full py-2 text-sm font-medium transition ${mode === 'signin' ? 'bg-gradient-to-r from-primary to-accent text-white' : 'text-muted-foreground hover:text-foreground'}`}>Sign in</button>
            </div>

            <Button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full h-11 rounded-full border border-border bg-background text-foreground font-semibold shadow-sm hover:bg-secondary disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span className="mr-2 text-lg font-bold">G</span>Continue with Google</>}
            </Button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">existing accounts</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              {mode === 'signup' && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                  New accounts are created through Google. After signing in, you'll be asked for your department and entry number.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">IIT Ropar Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your.name@iitrpr.ac.in" className="pl-10" autoComplete="email" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" autoComplete="current-password" />
                </div>
              </div>

              {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span></div>}
              {info && <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">{info}</div>}

              <Button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/25 hover:brightness-110 disabled:opacity-60">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In with Email & Password'}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Only students with a verified <span className="text-primary font-medium">@iitrpr.ac.in</span> Google account can join.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

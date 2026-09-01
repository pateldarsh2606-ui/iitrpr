'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@iitrpr\.ac\.in$/;

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);

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

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
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
                {mode === 'signup' ? 'Join using your IIT Ropar Google account' : 'Sign in using your IIT Ropar Google account'}
              </p>
            </div>

            <div className="mb-6 flex rounded-full border border-border bg-secondary/50 p-1">
              <button type="button" onClick={() => switchMode('signup')} className={`flex-1 rounded-full py-2 text-sm font-medium transition ${mode === 'signup' ? 'bg-gradient-to-r from-primary to-accent text-white' : 'text-muted-foreground hover:text-foreground'}`}>Sign up</button>
              <button type="button" onClick={() => switchMode('signin')} className={`flex-1 rounded-full py-2 text-sm font-medium transition ${mode === 'signin' ? 'bg-gradient-to-r from-primary to-accent text-white' : 'text-muted-foreground hover:text-foreground'}`}>Sign in</button>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                {mode === 'signup'
                  ? 'Create your account securely with your IIT Ropar Google account.'
                  : 'Use the same IIT Ropar Google account you registered with.'}
              </p>
            </div>

            <div className="mt-5">
              <Button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full h-12 rounded-full border border-border bg-background text-foreground font-semibold shadow-sm hover:bg-secondary disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span className="mr-2 text-lg font-bold">G</span>Continue with Google</>}
              </Button>
            </div>

            {error && (
              <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Only students with a verified <span className="text-primary font-medium">@iitrpr.ac.in</span> Google account can join.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, FormEvent, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Mail, Lock, User, ArrowLeft, Loader2, AlertCircle, Building2, Hash, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { DEPARTMENTS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@iitrpr\.ac\.in$/;
const RESEND_COOLDOWN = 60;

type Mode = 'signin' | 'signup';
type Step = 'form' | 'otp';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signup');
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [entryNumber, setEntryNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [info, setInfo] = useState<string | null>(null);

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
      m.includes('security purposes') ||
      m.includes('email rate') ||
      m.includes('for security reasons')
    );
  };

  const startCooldown = useCallback((seconds: number = RESEND_COOLDOWN) => {
    setCooldown(seconds);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendOtp = useCallback(async (emailAddress: string) => {
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: emailAddress,
    });
    if (resendError) {
      if (isRateLimitError(resendError.message)) {
        setError('Too many emails sent. Please wait a minute before requesting another code.');
        startCooldown(RESEND_COOLDOWN);
      } else {
        throw resendError;
      }
    } else {
      startCooldown(RESEND_COOLDOWN);
    }
  }, [startCooldown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

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
            setError('Too many attempts. Please wait a minute before trying again.');
            startCooldown(RESEND_COOLDOWN);
          } else if (signUpError.message.toLowerCase().includes('already registered')) {
            // User exists but may not have verified their email yet.
            // Switch to OTP step and resend the code.
            setStep('otp');
            setInfo(`We sent a 6-digit verification code to ${email}. Enter it below to activate your account.`);
            await sendOtp(email);
          } else {
            throw signUpError;
          }
          setLoading(false);
          return;
        }

        if (data.session && data.user) {
          // Email confirmation is off — proceed directly.
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
          // Email confirmation is on — OTP was sent.
          setStep('otp');
          setInfo(`We sent a 6-digit verification code to ${email}. Enter it below to activate your account.`);
          startCooldown(RESEND_COOLDOWN);
          setLoading(false);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          if (isRateLimitError(signInError.message)) {
            setError('Too many attempts. Please wait a minute before trying again.');
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
      setError(isRateLimitError(message) ? 'Too many attempts. Please wait a minute before trying again.' : message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      });

      if (verifyError) {
        if (isRateLimitError(verifyError.message)) {
          setError('Too many attempts. Please wait a minute before trying again.');
        } else if (verifyError.message.toLowerCase().includes('expired') || verifyError.message.toLowerCase().includes('invalid') || verifyError.message.toLowerCase().includes('incorrect')) {
          setError('That code is invalid or expired. Click "Resend code" to get a new one.');
        } else {
          throw verifyError;
        }
        setLoading(false);
        return;
      }

      if (data.session && data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: fullName.trim() || (data.user.user_metadata?.full_name as string) || '',
            department: department || (data.user.user_metadata?.department as string) || DEPARTMENTS[0],
            entry_number: (entryNumber.trim().toUpperCase()) || ((data.user.user_metadata?.entry_number as string) || '').toUpperCase(),
          }, { onConflict: 'id' });
        if (profileError) throw profileError;
        router.push('/dashboard');
      }
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string'
        ? err.message
        : 'Failed to verify code';
      setError(isRateLimitError(message) ? 'Too many attempts. Please wait a minute before trying again.' : message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setError(null);
    setLoading(true);
    try {
      await sendOtp(email);
      setInfo(`A new code was sent to ${email}.`);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string'
        ? err.message
        : 'Failed to resend code';
      setError(isRateLimitError(message) ? 'Too many emails sent. Please wait a minute before requesting another.' : message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setStep('form');
    setError(null);
    setInfo(null);
    setOtp('');
    setCooldown(0);
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
            {step === 'otp' ? (
              <>
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
                    <ShieldCheck className="h-7 w-7 text-white" />
                  </div>
                  <h1 className="font-display text-2xl font-bold">Verify your email</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter the 6-digit code we sent to your IIT Ropar email
                  </p>
                </div>

                {info && (
                  <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{info}</span>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-2">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(val) => setOtp(val)}
                      autoFocus
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="h-12 w-12 rounded-lg text-lg" />
                        <InputOTPSlot index={1} className="h-12 w-12 rounded-lg text-lg" />
                        <InputOTPSlot index={2} className="h-12 w-12 rounded-lg text-lg" />
                        <InputOTPSlot index={3} className="h-12 w-12 rounded-lg text-lg" />
                        <InputOTPSlot index={4} className="h-12 w-12 rounded-lg text-lg" />
                        <InputOTPSlot index={5} className="h-12 w-12 rounded-lg text-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="w-full h-11 rounded-full bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/25 hover:brightness-110 disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Verify & Continue'
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => { setStep('form'); setError(null); setInfo(null); setOtp(''); }}
                      className="flex items-center gap-1 text-muted-foreground transition hover:text-foreground"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={cooldown > 0 || loading}
                      className="font-medium text-primary transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
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
                    onClick={() => switchMode('signup')}
                    className={`flex-1 rounded-full py-2 text-sm font-medium transition ${mode === 'signup' ? 'bg-gradient-to-r from-primary to-accent text-white' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Sign up
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

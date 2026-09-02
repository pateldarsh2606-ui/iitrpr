'use client';

import Link from 'next/link';
import {
  Heart,
  Search,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Shield,
  Send,
  UserRound,
  BarChart3,
  UserX,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-romantic-glow overflow-hidden">
      {/* Floating decorative orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Heart className="h-5 w-5 text-white" fill="white" />
          </div>
          <span className="font-display text-xl font-semibold">Prom Match</span>
        </div>
        <Link
          href="/auth"
          className="group flex items-center gap-2 rounded-full border border-border bg-card/50 px-5 py-2.5 text-sm font-medium backdrop-blur-md transition hover:border-primary/50 hover:bg-primary/10"
        >
          Sign in
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-24 text-center sm:pt-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md animate-fade-in-up">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          IIT Ropar Prom Night 2026
        </div>

        <h1 className="font-display text-5xl font-bold leading-[1.1] tracking-tight sm:text-7xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Find your <span className="text-gradient-romantic">perfect match</span> for prom night
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Pick your secret crushes from the student directory. If they pick you back,
          we'll connect you both instantly. No awkward confessions, just magic.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Link
            href="/auth"
            className="group flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-8 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:shadow-primary/40 hover:brightness-110"
          >
            <Heart className="h-4 w-4" fill="currentColor" />
            Get Started
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            @iitrpr.ac.in only
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Search,
              title: 'Browse the directory',
              desc: 'Find verified IIT Ropar students by name, department, or interests and get to know them before making a move.',
            },
            {
              icon: Heart,
              title: 'Secret Crush',
              desc: 'Pick up to 3 people you like. Your choices stay completely secret unless they choose you too.',
            },
            {
              icon: Send,
              title: 'Crush Requests',
              desc: 'Want to be a little more direct? Send someone a crush request and let them accept or decline.',
            },
            {
              icon: UserRound,
              title: 'Make your profile yours',
              desc: 'Show off your music, movies, interests, vibe, bio, and your idea of the perfect Prom night.',
            },
            {
              icon: MessageCircle,
              title: 'Chat with your matches',
              desc: 'When the feeling is mutual, unlock a private real-time chat with conversation starters to break the ice.',
            },
            {
              icon: BarChart3,
              title: 'Campus Stats',
              desc: 'See fun, anonymous campus-wide trends like popular departments, vibes, and how many matches are happening.',
            },
            {
              icon: UserX,
              title: 'Unmatch anytime',
              desc: 'Changed your mind? You can unmatch and your conversation is removed for both people.',
            },
          ].map((f, i) => (
            <div
              key={f.title}
              className="glass-card rounded-2xl border border-border p-6 animate-fade-in-up"
              style={{ animationDelay: `${0.4 + i * 0.1}s` }}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        Made with <Heart className="inline h-3.5 w-3.5 text-primary" fill="currentColor" /> for IIT Ropar Prom Night
      </footer>
    </div>
  );
}

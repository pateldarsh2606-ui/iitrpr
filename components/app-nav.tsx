'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, LayoutGrid, MessageCircle, LogOut, Loader2, Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CompleteProfile } from '@/components/complete-profile';

const navItems = [
  { href: '/dashboard', label: 'Directory', icon: LayoutGrid },
  { href: '/crushes', label: 'Crushes', icon: Heart },
  { href: '/matches', label: 'Matches', icon: MessageCircle },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const handleSignOut = async () => { await signOut(); router.push('/'); };

  return <>
    <nav className="sticky top-0 z-40 hidden border-b border-border bg-background/80 backdrop-blur-xl sm:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent"><Heart className="h-4 w-4 text-white" fill="white" /></div><span className="font-display text-lg font-semibold">Prom Match</span></Link>
        <div className="flex items-center gap-1">{navItems.map((item) => { const active = pathname === item.href || pathname.startsWith(item.href + '/'); return <Link key={item.href} href={item.href} className={cn('flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition', active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary')}><item.icon className="h-4 w-4" />{item.label}</Link>; })}</div>
        <div className="flex items-center gap-3"><span className="hidden text-sm text-muted-foreground md:block">{profile?.full_name ?? 'Account'}</span><Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-secondary"><Link href="/settings"><SettingsIcon className="h-4 w-4" /></Link></Button><Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full hover:bg-destructive/10 hover:text-destructive"><LogOut className="h-4 w-4" /></Button></div>
      </div>
    </nav>

    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl sm:hidden"><div className="flex items-center justify-around overflow-x-auto px-1 py-2">{navItems.map((item) => { const active = pathname === item.href || pathname.startsWith(item.href + '/'); return <Link key={item.href} href={item.href} className={cn('flex min-w-[68px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition', active ? 'text-primary' : 'text-muted-foreground')}><item.icon className="h-5 w-5" />{item.label}</Link>; })}<Link href="/settings" className={cn('flex min-w-[68px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium', pathname === '/settings' ? 'text-primary' : 'text-muted-foreground')}><SettingsIcon className="h-5 w-5" />Settings</Link><button onClick={handleSignOut} className="flex min-w-[68px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground"><LogOut className="h-5 w-5" />Logout</button></div></nav>
  </>;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-romantic-glow"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) { router.push('/auth'); return <div className="flex min-h-screen items-center justify-center bg-romantic-glow"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>; }
  if (!profile) return <CompleteProfile />;
  return <>{children}</>;
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2, ShieldAlert, User as UserIcon, Mail, Building2, Hash } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { AppNav, AuthGate } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

function Settings() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    setError(null);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        setError("Your session has expired. Please sign in again.");
        setDeleting(false);
        return;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to delete account");
      }

      await signOut();
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-romantic-glow pb-20 sm:pb-0">
      <AppNav />
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your account and preferences.</p>

        {/* Profile info */}
        <div className="mt-8 glass-card rounded-2xl border border-border p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserIcon className="h-5 w-5 text-primary" />
            Your Profile
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-secondary/40 px-4 py-3">
              <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="ml-auto text-sm font-medium">{profile?.full_name ?? '—'}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-secondary/40 px-4 py-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="ml-auto text-sm font-medium">{user?.email ?? '—'}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-secondary/40 px-4 py-3">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Department</span>
              <span className="ml-auto text-sm font-medium text-right">{profile?.department ?? '—'}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-secondary/40 px-4 py-3">
              <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Entry Number</span>
              <span className="ml-auto text-sm font-medium">{profile?.entry_number ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Danger Zone
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Deleting your account will permanently remove your profile, crush selections, matches, and chat messages. This action cannot be undone.
          </p>
          <Button
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete my account
          </Button>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={(v) => { setConfirmOpen(v); if (!v) { setConfirmText(''); setError(null); } }}>
        <DialogContent className="max-w-sm border-destructive/30">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <DialogTitle className="text-center text-xl">Delete account?</DialogTitle>
            <DialogDescription className="text-center">
              This will permanently erase everything — your profile, crushes, matches, and messages. You cannot undo this.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Type <span className="font-bold text-destructive">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="mx-auto flex h-11 w-40 rounded-lg border border-border bg-background px-3 text-center text-sm font-medium uppercase outline-none transition focus:border-destructive/50 focus:ring-2 focus:ring-destructive/20"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => { setConfirmOpen(false); setConfirmText(''); setError(null); }}
              disabled={deleting}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting || confirmText !== 'DELETE'}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Permanently delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGate>
      <Settings />
    </AuthGate>
  );
}

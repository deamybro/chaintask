'use client';

import { useState } from 'react';
import { Mail, Wallet } from 'lucide-react';
import { api, short, sol, storeUser } from '@/lib/api';
import { User } from '@/lib/types';
import RialoFeatureBadge from './RialoFeatureBadge';

export default function WalletSimPanel({ onUser }: { onUser?: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  async function signup() {
    setError('');
    try {
      const data = await api.signup({ email, display_name: displayName });
      setUser(data.user);
      storeUser(data.user);
      onUser?.(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  }

  async function login() {
    setError('');
    try {
      const data = await api.login({ email });
      setUser(data.user);
      storeUser(data.user);
      onUser?.(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Wallet size={18} className="text-accent" /><h2 className="mono text-lg">Email Wallet</h2></div>
        <RialoFeatureBadge feature="real_world_identity" />
      </div>
      <div className="grid gap-3">
        <label className="text-sm text-[var(--text-secondary)]">Email</label>
        <div className="flex items-center gap-2 rounded border border-border bg-bg px-3 py-2">
          <Mail size={16} className="text-[var(--text-secondary)]" />
          <input className="focus-ring w-full bg-transparent outline-none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <label className="text-sm text-[var(--text-secondary)]">Display name</label>
        <input className="focus-ring rounded border border-border bg-bg px-3 py-2 outline-none" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ada Builder" />
        <div className="flex gap-2">
          <button className="focus-ring rounded bg-accent px-4 py-2 font-semibold text-bg" onClick={signup}>Sign up</button>
          <button className="focus-ring rounded border border-border px-4 py-2" onClick={login}>Log in</button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {user && (
          <div className="rounded border border-border bg-surface2 p-4 text-sm">
            <p className="font-semibold">{user.display_name}</p>
            <p className="mono text-xs text-[var(--text-secondary)]">{short(user.wallet_address)}</p>
            <p className="mt-2 text-accent">{sol(user.balance_lamports)}</p>
          </div>
        )}
      </div>
    </section>
  );
}

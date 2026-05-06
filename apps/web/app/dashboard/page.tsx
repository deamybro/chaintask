'use client';

import { useEffect, useState } from 'react';
import BountyCard from '@/components/BountyCard';
import WalletSimPanel from '@/components/WalletSimPanel';
import { api, getStoredUser, sol, short } from '@/lib/api';
import { Bounty, Transaction, User } from '@/lib/types';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [posted, setPosted] = useState<Bounty[]>([]);
  const [claimed, setClaimed] = useState<Bounty[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  async function load(current: User | null) {
    if (!current) return;
    const data = await api.user(current.id);
    setUser(data.user);
    setPosted(data.posted_bounties);
    setClaimed(data.claimed_bounties);
    setTransactions(data.transactions);
  }

  useEffect(() => {
    const current = getStoredUser();
    setUser(current);
    void load(current);
  }, []);

  return (
    <main className="shell grid gap-6 py-10 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-6">
        <WalletSimPanel onUser={(next) => { setUser(next); void load(next); }} />
        {user && (
          <section className="panel p-5">
            <p className="text-sm text-[var(--text-secondary)]">Balance</p>
            <p className="mono text-3xl text-accent">{sol(user.balance_lamports)}</p>
            <p className="mono mt-2 text-xs text-[var(--text-secondary)]">{short(user.wallet_address)}</p>
          </section>
        )}
      </aside>
      <div className="space-y-8">
        <section>
          <h1 className="mono mb-4 text-4xl">Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Your Rialo identity, escrow activity, and contribution payouts.</p>
        </section>
        <section>
          <h2 className="mono mb-4 text-2xl">My Posted Bounties</h2>
          <div className="grid gap-5 md:grid-cols-2">{posted.map((bounty) => <BountyCard key={bounty.id} bounty={bounty} />)}</div>
          {user && posted.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No posted bounties yet.</p>}
        </section>
        <section>
          <h2 className="mono mb-4 text-2xl">My Claimed Bounties</h2>
          <div className="grid gap-5 md:grid-cols-2">{claimed.map((bounty) => <BountyCard key={bounty.id} bounty={bounty} />)}</div>
          {user && claimed.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No claimed bounties yet.</p>}
        </section>
        <section className="panel p-5">
          <h2 className="mono mb-4 text-2xl">Transaction History</h2>
          <div className="grid gap-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex flex-wrap justify-between gap-3 rounded border border-border bg-surface2 p-3 text-sm">
                <span>{tx.type}</span><span className="text-accent">{sol(tx.amount_lamports)}</span><span className="mono text-[var(--text-secondary)]">{short(tx.tx_hash)}</span>
              </div>
            ))}
            {transactions.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No transactions yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

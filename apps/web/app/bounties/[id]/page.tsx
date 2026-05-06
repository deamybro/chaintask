'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Play, RefreshCw } from 'lucide-react';
import StatusTracker from '@/components/StatusTracker';
import WalletSimPanel from '@/components/WalletSimPanel';
import RialoFeatureBadge from '@/components/RialoFeatureBadge';
import { api, getStoredUser, short, sol } from '@/lib/api';
import { Bounty, PollLog, Transaction, User } from '@/lib/types';

export default function BountyDetailPage({ params }: { params: { id: string } }) {
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [pollLog, setPollLog] = useState<PollLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [issue, setIssue] = useState<{ title?: string; state?: string; html_url?: string; body?: string | null } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [prNumber, setPrNumber] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const data = await api.bounty(params.id);
    setBounty(data.bounty);
    setPollLog(data.poll_log);
    setTransactions(data.transactions);
    setIssue(data.github_issue);
  }

  useEffect(() => {
    setUser(getStoredUser());
    void load();
  }, [params.id]);

  async function claim() {
    if (!user) return setMessage('Sign up or log in before claiming.');
    try {
      const data = await api.claim(params.id, { assignee_id: user.id, linked_pr_number: Number(prNumber) });
      setBounty(data.bounty);
      setMessage('Bounty claimed. Reactive polling is now active.');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Claim failed');
    }
  }

  async function verify() {
    try {
      const data = await api.verify(params.id);
      setBounty(data.bounty);
      setMessage(`Manual Rialo poll complete: ${data.result.action}.`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Verify failed');
    }
  }

  if (!bounty) return <main className="shell py-10">Loading bounty...</main>;

  return (
    <main className="shell grid gap-6 py-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="panel p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <RialoFeatureBadge feature="native_https" />
            <RialoFeatureBadge feature="reactive_tx" />
            <RialoFeatureBadge feature="escrow_pda" />
          </div>
          <div className="flex flex-col justify-between gap-5 md:flex-row">
            <div>
              <p className="mono text-sm uppercase text-[var(--text-secondary)]">{bounty.repo_owner}/{bounty.repo_name} issue #{bounty.issue_number}</p>
              <h1 className="mt-2 text-4xl font-bold leading-tight">{bounty.title}</h1>
              <p className="mt-4 max-w-3xl leading-7 text-[var(--text-secondary)]">{bounty.description}</p>
            </div>
            <div className="min-w-[180px] rounded border border-border bg-surface2 p-4">
              <p className="text-sm text-[var(--text-secondary)]">Escrow</p>
              <p className="mono text-2xl text-accent">{sol(bounty.amount_lamports)}</p>
              <p className="mt-2 text-sm capitalize">{bounty.status.replace('_', ' ')}</p>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="mono text-lg">GitHub Issue Preview</h2>
            {issue?.html_url && <a className="inline-flex items-center gap-1 text-sm text-accent" href={issue.html_url} target="_blank">Open <ExternalLink size={14} /></a>}
          </div>
          <p className="font-semibold">{issue?.title ?? bounty.title}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">State: {issue?.state ?? 'unavailable'}</p>
          {issue?.body && <p className="mt-4 line-clamp-5 text-sm leading-6 text-[var(--text-secondary)]">{issue.body}</p>}
        </section>

        <section className="panel p-5">
          <h2 className="mono mb-4 text-lg">Claim and Verify</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input className="focus-ring flex-1 rounded border border-border bg-bg px-3 py-3 outline-none" placeholder="Pull request number" value={prNumber} onChange={(e) => setPrNumber(e.target.value)} />
            <button className="focus-ring inline-flex items-center justify-center gap-2 rounded bg-accent px-4 py-3 font-semibold text-bg" onClick={claim}><Play size={16} /> Claim</button>
            <button className="focus-ring inline-flex items-center justify-center gap-2 rounded border border-border px-4 py-3" onClick={verify}><RefreshCw size={16} /> Verify</button>
          </div>
          {message && <p className="mt-3 text-sm text-accent">{message}</p>}
        </section>

        <StatusTracker bountyId={bounty.id} prNumber={bounty.linked_pr_number} />
      </div>

      <aside className="space-y-6">
        <WalletSimPanel onUser={setUser} />
        <section className="panel p-5">
          <h2 className="mono mb-4 text-lg">Transactions</h2>
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="rounded border border-border bg-surface2 p-3 text-sm">
                <div className="mb-1 flex justify-between gap-2"><span>{tx.type}</span><span className="text-accent">{sol(tx.amount_lamports)}</span></div>
                <p className="mono text-xs text-[var(--text-secondary)]">{short(tx.tx_hash)}</p>
              </div>
            ))}
            {transactions.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No transactions recorded yet.</p>}
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="mono mb-4 text-lg">Recent Polls</h2>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            {pollLog.slice(0, 4).map((row) => <p key={row.id}>{row.github_status} - {row.action_taken}</p>)}
            {pollLog.length === 0 && <p>No poll events yet.</p>}
          </div>
        </section>
      </aside>
    </main>
  );
}

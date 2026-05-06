'use client';

import { useEffect, useMemo, useState } from 'react';
import BountyCard from '@/components/BountyCard';
import { api } from '@/lib/api';
import { Bounty, BountyStatus } from '@/lib/types';

export default function BountiesPage() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [status, setStatus] = useState<BountyStatus | 'all'>('all');
  const [repo, setRepo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.bounties().then((data) => setBounties(data.bounties)).catch((err: Error) => setError(err.message));
  }, []);

  const filtered = useMemo(() => bounties.filter((bounty) => {
    const statusOk = status === 'all' || bounty.status === status;
    const repoOk = !repo || `${bounty.repo_owner}/${bounty.repo_name}`.toLowerCase().includes(repo.toLowerCase());
    return statusOk && repoOk;
  }), [bounties, status, repo]);

  return (
    <main className="shell py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="mono text-4xl">Bounties</h1>
          <p className="mt-2 text-[var(--text-secondary)]">Live escrow state from the Rialo simulation layer.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select className="focus-ring rounded border border-border bg-surface px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as BountyStatus | 'all')}>
            {['all', 'open', 'in_progress', 'completed', 'cancelled'].map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}
          </select>
          <input className="focus-ring rounded border border-border bg-surface px-3 py-2 outline-none" placeholder="repo filter" value={repo} onChange={(e) => setRepo(e.target.value)} />
        </div>
      </div>
      {error && <p className="mb-4 text-danger">{error}</p>}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((bounty) => <BountyCard key={bounty.id} bounty={bounty} />)}
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { api, short } from '@/lib/api';
import { PollLog } from '@/lib/types';
import RialoFeatureBadge from './RialoFeatureBadge';

export default function StatusTracker({ bountyId, prNumber }: { bountyId: string; prNumber: number | null }) {
  const [rows, setRows] = useState<PollLog[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const data = await api.pollLog(bountyId);
      if (alive) setRows(data.poll_log);
    };
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [bountyId]);

  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-accent" />
          <h2 className="mono text-lg">Rialo Reactive Execution Log</h2>
        </div>
        <RialoFeatureBadge feature="reactive_tx" />
      </div>
      <div className="space-y-3">
        {rows.length === 0 && (
          <p className="rounded border border-border bg-surface2 p-4 text-sm text-[var(--text-secondary)]">
            {prNumber ? `Waiting for the next runtime check of PR #${prNumber}.` : 'Claim this bounty with a PR number to start reactive polling.'}
          </p>
        )}
        {rows.map((row) => (
          <div key={row.id} className="animate-[slide-in_.22s_ease-out] rounded border border-border bg-surface2 p-4 text-sm">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="mono text-xs text-[var(--text-secondary)]">{new Date(row.checked_at * 1000).toLocaleString()}</span>
              <span className="text-accent">{row.action_taken.replace('_', ' ')}</span>
            </div>
            <p>Rialo Runtime checked GitHub API - PR #{prNumber ?? 'pending'} is {row.github_status}.</p>
            {row.tx_hash && <p className="mt-2 mono text-xs text-accent">Escrow released: {short(row.tx_hash)}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

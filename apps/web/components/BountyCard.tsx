import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import RialoFeatureBadge from './RialoFeatureBadge';
import { Bounty } from '@/lib/types';
import { sol } from '@/lib/api';

const statusTone = {
  open: 'bg-accent',
  in_progress: 'bg-warning',
  completed: 'bg-sky-400',
  cancelled: 'bg-danger'
};

export default function BountyCard({ bounty }: { bounty: Bounty }) {
  return (
    <Link href={`/bounties/${bounty.id}`} className="group panel relative block min-h-[230px] overflow-hidden p-5 transition hover:-translate-y-1 hover:border-accent/60">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs uppercase text-[var(--text-secondary)]">
          <span className={`h-2.5 w-2.5 rounded-full ${statusTone[bounty.status]} ${bounty.status === 'in_progress' ? 'animate-[pulse-dot_1.2s_ease-in-out_infinite]' : ''}`} />
          {bounty.status.replace('_', ' ')}
        </span>
        <strong className="mono text-accent">{sol(bounty.amount_lamports)}</strong>
      </div>
      <h3 className="mb-3 text-xl font-semibold leading-tight">{bounty.title}</h3>
      <p className="mb-5 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{bounty.description}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded border border-border bg-surface2 px-2 py-1">{bounty.repo_owner}/{bounty.repo_name}</span>
        <span className="rounded border border-border bg-surface2 px-2 py-1">Issue #{bounty.issue_number}</span>
        <ExternalLink size={14} />
      </div>
      <div className="absolute bottom-4 left-5"><RialoFeatureBadge feature="native_https" /></div>
      <div className="absolute inset-x-0 bottom-0 translate-y-full border-t border-border bg-surface2 p-4 text-sm text-white transition group-hover:translate-y-0">
        {bounty.linked_pr_number ? `Linked PR #${bounty.linked_pr_number} is watched by the Rialo runtime.` : 'Open for claim. Link a PR to start reactive polling.'}
      </div>
    </Link>
  );
}

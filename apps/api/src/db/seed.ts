/**
 * RIALO DEMO STATE SEED
 *
 * These rows create realistic escrow PDA state for local demos. They use public
 * GitHub repositories so the Rialo HTTPS simulation can query live issue and PR
 * metadata without an oracle, auth token, or middleware.
 */
import crypto from 'crypto';
import db from './schema';
import { signUpWithEmail } from '../rialo/identity';
import { lockEscrow } from '../rialo/escrow';

const alice = signUpWithEmail('alice@chaintask.dev', 'Alice Client');
const rina = signUpWithEmail('rina@chaintask.dev', 'Rina Contributor');
const sam = signUpWithEmail('sam@chaintask.dev', 'Sam Maintainer');

db.prepare('UPDATE users SET balance_lamports = 1000000000000 WHERE email IN (?, ?, ?)')
  .run(alice.email, rina.email, sam.email);

const demoBounties = [
  {
    repo_owner: 'nicehash',
    repo_name: 'NiceHashQuickMiner',
    issue_number: 1,
    title: 'Fix memory leak in GPU monitoring thread',
    description: 'Trace the monitoring loop, isolate the retained allocation, and ship a PR with before/after profiler notes.',
    amount_lamports: 500_000_000,
    status: 'open',
    creator_id: alice.id
  },
  {
    repo_owner: 'facebook',
    repo_name: 'react',
    issue_number: 28,
    title: 'Improve error boundary stack trace formatting',
    description: 'Make stack traces easier to scan in nested component failures while preserving current public behavior.',
    amount_lamports: 2_000_000_000,
    status: 'in_progress',
    creator_id: alice.id,
    assignee_id: rina.id,
    linked_pr_number: 29
  },
  {
    repo_owner: 'vercel',
    repo_name: 'next.js',
    issue_number: 93535,
    title: 'Review TypeScript default export arrow function handling',
    description: 'Demo watcher for a currently open PR so the Rialo runtime log keeps polling during live presentations.',
    amount_lamports: 600_000_000,
    status: 'in_progress',
    creator_id: sam.id,
    assignee_id: rina.id,
    linked_pr_number: 93535
  },
  {
    repo_owner: 'vercel',
    repo_name: 'next.js',
    issue_number: 1,
    title: 'Document app routing edge case for nested layouts',
    description: 'Add a concise docs fix covering nested layout resolution and include a runnable reproduction.',
    amount_lamports: 750_000_000,
    status: 'open',
    creator_id: sam.id
  },
  {
    repo_owner: 'nodejs',
    repo_name: 'node',
    issue_number: 2,
    title: 'Tighten diagnostics around stream backpressure',
    description: 'Improve developer-facing diagnostics for stream pressure transitions without changing runtime semantics.',
    amount_lamports: 1_250_000_000,
    status: 'completed',
    creator_id: sam.id,
    assignee_id: rina.id,
    linked_pr_number: 3
  },
  {
    repo_owner: 'microsoft',
    repo_name: 'TypeScript',
    issue_number: 5,
    title: 'Clarify generic inference error message',
    description: 'Refine a confusing inference diagnostic and add focused compiler baseline coverage.',
    amount_lamports: 900_000_000,
    status: 'open',
    creator_id: alice.id
  }
] as const;

for (const bounty of demoBounties) {
  const existing = db.prepare('SELECT * FROM bounties WHERE repo_owner = ? AND repo_name = ? AND issue_number = ? AND title = ?')
    .get(bounty.repo_owner, bounty.repo_name, bounty.issue_number, bounty.title);
  if (existing) {
    const existingBounty = existing as { id: string; creator_id: string; amount_lamports: number; contract_address: string | null };
    if (!existingBounty.contract_address) {
      void lockEscrow({ bountyId: existingBounty.id, creatorId: existingBounty.creator_id, amountLamports: existingBounty.amount_lamports });
    }
    continue;
  }
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO bounties (
      id, title, description, repo_owner, repo_name, issue_number, amount_lamports,
      status, creator_id, assignee_id, linked_pr_number, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    bounty.title,
    bounty.description,
    bounty.repo_owner,
    bounty.repo_name,
    bounty.issue_number,
    bounty.amount_lamports,
    bounty.status,
    bounty.creator_id,
    'assignee_id' in bounty ? bounty.assignee_id : null,
    'linked_pr_number' in bounty ? bounty.linked_pr_number : null,
    bounty.status === 'completed' ? Math.floor(Date.now() / 1000) - 86400 : null
  );
  void lockEscrow({ bountyId: id, creatorId: bounty.creator_id, amountLamports: bounty.amount_lamports });
}

console.log('Seeded ChainTask demo users and bounties.');

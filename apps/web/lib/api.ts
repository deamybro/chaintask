import { Bounty, PollLog, Transaction, User } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || API_URL.length === 0;

const bountyKey = 'chaintask-demo-bounties';
const userKey = 'chaintask-demo-users';
const pollKey = 'chaintask-demo-polls';
const txKey = 'chaintask-demo-transactions';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (DEMO_MODE) return demoRequest<T>(path, init);
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store'
  });
  const data = await res.json() as T & { error?: string; rialo_context?: string };
  if (!res.ok) throw new Error(data.error ? `${data.error} ${data.rialo_context ?? ''}` : 'API request failed');
  return data;
}

export const sol = (lamports: number) => `${(lamports / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
export const short = (value: string | null | undefined) => value ? `${value.slice(0, 8)}...${value.slice(-6)}` : 'pending';

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('chaintask-user');
  return raw ? JSON.parse(raw) as User : null;
}

export function storeUser(user: User): void {
  window.localStorage.setItem('chaintask-user', JSON.stringify(user));
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

function id(prefix = ''): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}${crypto.randomUUID()}`;
  return `${prefix}${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function txHash(): string {
  return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
}

function walletFromEmail(email: string): string {
  let hash = 0;
  for (const char of `${email.toLowerCase()}rialo-devnet`) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return Array.from({ length: 40 }, (_, index) => Math.abs(hash + index * 2654435761).toString(16).slice(0, 1)).join('');
}

const seedUsers: User[] = [
  { id: 'demo-alice', email: 'alice@chaintask.dev', display_name: 'Alice Client', wallet_address: walletFromEmail('alice@chaintask.dev'), balance_lamports: 1_000_000_000_000, created_at: now() },
  { id: 'demo-rina', email: 'rina@chaintask.dev', display_name: 'Rina Contributor', wallet_address: walletFromEmail('rina@chaintask.dev'), balance_lamports: 1_000_000_000_000, created_at: now() }
];

const seedBounties: Bounty[] = [
  {
    id: 'demo-bounty-next-pr',
    title: 'Review TypeScript default export arrow function handling',
    description: 'Demo watcher for a public Next.js PR. In Vercel-only mode the browser simulates Rialo reactive execution and checks GitHub directly.',
    repo_owner: 'vercel',
    repo_name: 'next.js',
    issue_number: 93535,
    amount_lamports: 600_000_000,
    currency: 'SOL',
    status: 'in_progress',
    creator_id: 'demo-alice',
    assignee_id: 'demo-rina',
    linked_pr_number: 93535,
    contract_address: 'demoescrow93535vercelnextjs000000000',
    tx_hash: txHash(),
    created_at: now() - 7200,
    completed_at: null
  },
  {
    id: 'demo-bounty-open',
    title: 'Document app routing edge case for nested layouts',
    description: 'Add a concise docs fix covering nested layout resolution and include a runnable reproduction.',
    repo_owner: 'vercel',
    repo_name: 'next.js',
    issue_number: 1,
    amount_lamports: 750_000_000,
    currency: 'SOL',
    status: 'open',
    creator_id: 'demo-alice',
    assignee_id: null,
    linked_pr_number: null,
    contract_address: 'demoescrow0001vercelnextjs0000000000',
    tx_hash: txHash(),
    created_at: now() - 5400,
    completed_at: null
  }
];

function readList<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(raw) as T[];
}

function writeList<T>(key: string, value: T[]): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value));
}

async function githubIssue(owner: string, repo: string, issue: string) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issue}`, {
    headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'ChainTask-Vercel-Demo' },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`GitHub issue unavailable: ${res.status}`);
  return res.json() as Promise<{ title: string; state: string; html_url: string; body?: string | null }>;
}

async function githubPr(owner: string, repo: string, pr: number) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pr}`, {
    headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'ChainTask-Vercel-Demo' },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`GitHub PR unavailable: ${res.status}`);
  return res.json() as Promise<{ state: string; merged: boolean; title: string; html_url: string; merged_at: string | null }>;
}

async function demoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  const bounties = readList<Bounty>(bountyKey, seedBounties);
  const users = readList<User>(userKey, seedUsers);
  const polls = readList<PollLog>(pollKey, []);
  const txs = readList<Transaction>(txKey, []);
  const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};

  if (path === '/health') {
    return { ok: true, active_bounties_polled: bounties.filter((bounty) => bounty.status === 'in_progress').length, last_poll_at: now(), poll_interval_ms: 15000 } as T;
  }
  if (path.startsWith('/bounties') && method === 'GET' && path !== '/bounties') {
    const bounty = bounties.find((item) => item.id === path.split('/')[2]);
    if (!bounty) throw new Error('Bounty not found');
    let issuePreview: { title: string; state: string; html_url: string; body?: string | null } = {
      title: bounty.title,
      state: bounty.status,
      html_url: `https://github.com/${bounty.repo_owner}/${bounty.repo_name}/issues/${bounty.issue_number}`,
      body: bounty.description
    };
    try {
      issuePreview = await githubIssue(bounty.repo_owner, bounty.repo_name, String(bounty.issue_number));
    } catch {}
    return { bounty, poll_log: polls.filter((row) => row.bounty_id === bounty.id).sort((a, z) => z.id - a.id), transactions: txs.filter((tx) => tx.bounty_id === bounty.id), github_issue: issuePreview } as T;
  }
  if (path === '/bounties' && method === 'GET') return { bounties: [...bounties].sort((a, z) => z.created_at - a.created_at) } as T;
  if (path === '/bounties' && method === 'POST') {
    const creator = users.find((user) => user.id === body.creator_id);
    if (!creator) throw new Error('Sign up before creating a bounty');
    const amount = Number(body.amount_lamports);
    if (creator.balance_lamports < amount) throw new Error('Insufficient simulated balance');
    creator.balance_lamports -= amount;
    const bounty: Bounty = {
      id: id('demo-bounty-'),
      title: String(body.title),
      description: String(body.description),
      repo_owner: String(body.repo_owner),
      repo_name: String(body.repo_name),
      issue_number: Number(body.issue_number),
      amount_lamports: amount,
      currency: 'SOL',
      status: 'open',
      creator_id: creator.id,
      assignee_id: null,
      linked_pr_number: null,
      contract_address: id('demoescrow').replaceAll('-', '').slice(0, 40),
      tx_hash: txHash(),
      created_at: now(),
      completed_at: null
    };
    bounties.unshift(bounty);
    txs.unshift({ id: id('tx-'), bounty_id: bounty.id, from_address: creator.wallet_address, to_address: bounty.contract_address ?? 'demoescrow', amount_lamports: amount, type: 'deposit', tx_hash: bounty.tx_hash ?? txHash(), created_at: now() });
    writeList(userKey, users);
    writeList(bountyKey, bounties);
    writeList(txKey, txs);
    return { bounty, escrow: { txHash: bounty.tx_hash ?? txHash(), contractAddress: bounty.contract_address ?? 'demoescrow' } } as T;
  }
  if (path.endsWith('/claim') && method === 'PATCH') {
    const bounty = bounties.find((item) => item.id === path.split('/')[2]);
    if (!bounty) throw new Error('Bounty not found');
    if (bounty.status !== 'open') throw new Error('Only open bounties can be claimed');
    bounty.status = 'in_progress';
    bounty.assignee_id = String(body.assignee_id);
    bounty.linked_pr_number = Number(body.linked_pr_number);
    writeList(bountyKey, bounties);
    return { bounty } as T;
  }
  if (path.endsWith('/verify') && method === 'POST') {
    const bounty = bounties.find((item) => item.id === path.split('/')[2]);
    if (!bounty || !bounty.linked_pr_number) throw new Error('No linked PR to verify');
    const pr = await githubPr(bounty.repo_owner, bounty.repo_name, bounty.linked_pr_number);
    let action = pr.merged ? 'released' : 'still_open';
    const poll: PollLog = { id: Date.now(), bounty_id: bounty.id, checked_at: now(), github_status: pr.merged ? 'merged' : pr.state, action_taken: pr.merged ? 'escrow_released' : 'waiting', tx_hash: null };
    if (pr.merged && bounty.status !== 'completed') {
      bounty.status = 'completed';
      bounty.completed_at = now();
      const assignee = users.find((user) => user.id === bounty.assignee_id);
      const releaseTx = txHash();
      poll.tx_hash = releaseTx;
      if (assignee) {
        assignee.balance_lamports += bounty.amount_lamports;
        txs.unshift({ id: id('tx-'), bounty_id: bounty.id, from_address: bounty.contract_address ?? 'demoescrow', to_address: assignee.wallet_address, amount_lamports: bounty.amount_lamports, type: 'release', tx_hash: releaseTx, created_at: now() });
      }
    }
    if (!pr.merged) action = 'still_open';
    polls.unshift(poll);
    writeList(bountyKey, bounties);
    writeList(userKey, users);
    writeList(pollKey, polls);
    writeList(txKey, txs);
    return { bounty, result: { action, merged: pr.merged } } as T;
  }
  if (path.startsWith('/poll-log/')) {
    const bountyId = path.split('/')[2];
    return { poll_log: polls.filter((row) => row.bounty_id === bountyId).sort((a, z) => z.id - a.id) } as T;
  }
  if (path === '/auth/signup' && method === 'POST') {
    const email = String(body.email).toLowerCase();
    let user = users.find((item) => item.email === email);
    if (!user) {
      user = { id: id('demo-user-'), email, display_name: String(body.display_name || email.split('@')[0]), wallet_address: walletFromEmail(email), balance_lamports: 1_000_000_000_000, created_at: now() };
      users.push(user);
      writeList(userKey, users);
    }
    return { user } as T;
  }
  if (path === '/auth/login' && method === 'POST') {
    const user = users.find((item) => item.email === String(body.email).toLowerCase());
    if (!user) throw new Error('User not found');
    return { user } as T;
  }
  if (path.startsWith('/users/')) {
    const user = users.find((item) => item.id === path.split('/')[2]);
    if (!user) throw new Error('User not found');
    return {
      user,
      posted_bounties: bounties.filter((bounty) => bounty.creator_id === user.id),
      claimed_bounties: bounties.filter((bounty) => bounty.assignee_id === user.id),
      transactions: txs.filter((tx) => tx.from_address === user.wallet_address || tx.to_address === user.wallet_address)
    } as T;
  }
  if (path.startsWith('/github/issue')) {
    const params = new URLSearchParams(path.split('?')[1] ?? '');
    const preview = await githubIssue(String(params.get('owner')), String(params.get('repo')), String(params.get('issue')));
    return { github_issue: preview, linked_prs: [] } as T;
  }
  throw new Error(`Demo route not implemented: ${method} ${path}`);
}

export const api = {
  health: () => request<{ ok: boolean; active_bounties_polled: number; last_poll_at: number | null; poll_interval_ms: number }>('/health'),
  bounties: (query = '') => request<{ bounties: Bounty[] }>(`/bounties${query}`),
  bounty: (id: string) => request<{ bounty: Bounty; poll_log: PollLog[]; transactions: Transaction[]; github_issue: { title?: string; state?: string; html_url?: string; body?: string | null } }>(`/bounties/${id}`),
  createBounty: (body: unknown) => request<{ bounty: Bounty; escrow: { txHash: string; contractAddress: string } }>('/bounties', { method: 'POST', body: JSON.stringify(body) }),
  claim: (id: string, body: unknown) => request<{ bounty: Bounty }>(`/bounties/${id}/claim`, { method: 'PATCH', body: JSON.stringify(body) }),
  verify: (id: string) => request<{ bounty: Bounty; result: { action: string; merged: boolean } }>(`/bounties/${id}/verify`, { method: 'POST' }),
  pollLog: (id: string) => request<{ poll_log: PollLog[] }>(`/poll-log/${id}`),
  signup: (body: unknown) => request<{ user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: unknown) => request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  user: (id: string) => request<{ user: User; posted_bounties: Bounty[]; claimed_bounties: Bounty[]; transactions: Transaction[] }>(`/users/${id}`),
  githubIssue: (owner: string, repo: string, issue: string) => request<{ github_issue: { title: string; state: string; html_url: string; body?: string | null }; linked_prs: number[] }>(`/github/issue?owner=${owner}&repo=${repo}&issue=${issue}`)
};

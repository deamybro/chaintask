import { Bounty, PollLog, Transaction, User } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

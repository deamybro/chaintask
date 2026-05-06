'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Github, Lock } from 'lucide-react';
import { api, getStoredUser, short, sol } from '@/lib/api';
import { User } from '@/lib/types';
import WalletSimPanel from './WalletSimPanel';
import RialoFeatureBadge from './RialoFeatureBadge';

export default function CreateBountyForm() {
  const [user, setUser] = useState<User | null>(null);
  const [repo, setRepo] = useState('vercel/next.js');
  const [issue, setIssue] = useState('1');
  const [issuePreview, setIssuePreview] = useState<{ title: string; state: string; html_url: string } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0.5');
  const [result, setResult] = useState<{ txHash: string; contractAddress: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => setUser(getStoredUser()), []);

  async function validateIssue() {
    setError('');
    const [owner, name] = repo.split('/');
    if (!owner || !name) return setError('Repo must be owner/name.');
    try {
      const data = await api.githubIssue(owner, name, issue);
      setIssuePreview(data.github_issue);
      setTitle(data.github_issue.title);
      setDescription(data.github_issue.body?.slice(0, 360) || `Bounty for ${owner}/${name} issue #${issue}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub validation failed');
    }
  }

  async function create() {
    if (!user) return setError('Sign up or log in first.');
    const [owner, name] = repo.split('/');
    if (!owner || !name) return setError('Repo must be owner/name.');
    try {
      const data = await api.createBounty({
        title,
        description,
        repo_owner: owner,
        repo_name: name,
        issue_number: Number(issue),
        amount_lamports: Math.round(Number(amount) * 1_000_000_000),
        creator_id: user.id
      });
      setResult(data.escrow);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create bounty failed');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="panel p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="mono text-3xl">Post a Bounty</h1>
          <RialoFeatureBadge feature="escrow_pda" />
        </div>
        <div className="grid gap-5">
          <div>
            <label className="mb-2 block text-sm text-[var(--text-secondary)]">GitHub repo</label>
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded border border-border bg-bg px-3">
                <Github size={16} className="text-[var(--text-secondary)]" />
                <input className="focus-ring w-full bg-transparent py-3 outline-none" value={repo} onChange={(e) => setRepo(e.target.value)} />
              </div>
              <button className="focus-ring rounded bg-accent px-4 font-semibold text-bg" onClick={validateIssue}>Validate</button>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm text-[var(--text-secondary)]">Issue number</label>
            <input className="focus-ring w-full rounded border border-border bg-bg px-3 py-3 outline-none" value={issue} onChange={(e) => setIssue(e.target.value)} />
          </div>
          {issuePreview && (
            <div className="rounded border border-accent/30 bg-[var(--accent-dim)] p-4">
              <div className="mb-2 flex items-center gap-2 text-accent"><CheckCircle2 size={18} /> Issue found: {issuePreview.state}</div>
              <a className="font-semibold underline" href={issuePreview.html_url} target="_blank">{issuePreview.title}</a>
            </div>
          )}
          <div>
            <label className="mb-2 block text-sm text-[var(--text-secondary)]">Bounty title</label>
            <input className="focus-ring w-full rounded border border-border bg-bg px-3 py-3 outline-none" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[var(--text-secondary)]">Description</label>
            <textarea className="focus-ring min-h-[130px] w-full rounded border border-border bg-bg px-3 py-3 outline-none" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[var(--text-secondary)]">Amount in SOL</label>
            <input className="focus-ring w-full rounded border border-border bg-bg px-3 py-3 outline-none" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <button className="focus-ring inline-flex items-center justify-center gap-2 rounded bg-accent px-5 py-3 font-semibold text-bg" onClick={create}>
            <Lock size={18} /> Confirm and Lock {sol(Math.round(Number(amount || 0) * 1_000_000_000))}
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
          {result && (
            <div className="rounded border border-accent/40 bg-surface2 p-5">
              <p className="mb-3 text-accent">Escrow locked. Funds moved wallet to contract address.</p>
              <p className="mono text-xs">tx {short(result.txHash)}</p>
              <p className="mono text-xs">contract {short(result.contractAddress)}</p>
            </div>
          )}
        </div>
      </section>
      <WalletSimPanel onUser={setUser} />
    </div>
  );
}

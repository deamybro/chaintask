import Link from 'next/link';
import { ArrowRight, Code2 } from 'lucide-react';
import RialoFeatureBadge from '@/components/RialoFeatureBadge';
import { api } from '@/lib/api';

export default async function LandingPage() {
  const [health, bounties] = await Promise.all([
    api.health().catch(() => null),
    api.bounties().catch(() => ({ bounties: [] }))
  ]);

  return (
    <main>
      <section className="shell grid min-h-[calc(100vh-64px)] content-center gap-10 py-12 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <div className="mb-5 flex flex-wrap gap-2">
            <RialoFeatureBadge feature="native_https" />
            <RialoFeatureBadge feature="reactive_tx" />
            <RialoFeatureBadge feature="real_world_identity" />
          </div>
          <h1 className="mono max-w-4xl text-5xl font-bold leading-[1.06] md:text-7xl">The bounty pays itself.</h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-[var(--text-secondary)]">
            ChainTask uses Rialo&apos;s native HTTPS connectivity to watch GitHub directly from the smart contract. Zero oracles. Zero bots. Just code.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="inline-flex items-center gap-2 rounded bg-accent px-5 py-3 font-semibold text-bg" href="/bounties/new">Post a Bounty <ArrowRight size={18} /></Link>
            <Link className="rounded border border-border px-5 py-3" href="/bounties">Browse Bounties</Link>
          </div>
        </div>
        <div className="grid gap-4">
          {[
            ['Native HTTPS', 'let pr = await https.get(githubPullUrl);', 'No oracle request round, no LINK balance, no middleware.'],
            ['Reactive Execution', 'rialo::reactive::every(10, check_pr);', 'The contract wakes itself across blocks and settles when GitHub changes.'],
            ['Email Identity', 'wallet = rialo::identity::from_email(email);', 'Users get a Web3 address from real-world login, not wallet setup.']
          ].map(([title, code, copy]) => (
            <article key={title} className="panel p-5">
              <div className="mb-3 flex items-center gap-2 text-accent"><Code2 size={18} /><h2 className="mono text-lg">{title}</h2></div>
              <pre className="mb-3 overflow-auto rounded bg-bg p-3 text-sm text-accent">{code}</pre>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="border-y border-border bg-surface/70 py-8">
        <div className="shell grid gap-5 md:grid-cols-3">
          <div><p className="mono text-2xl text-accent">{health?.active_bounties_polled ?? 0}</p><p className="text-sm text-[var(--text-secondary)]">active reactive watchers</p></div>
          <div><p className="mono text-2xl text-accent">{bounties.bounties.length}</p><p className="text-sm text-[var(--text-secondary)]">escrow PDAs mirrored locally</p></div>
          <div><p className="mono text-2xl text-accent">{health?.last_poll_at ? new Date(health.last_poll_at * 1000).toLocaleTimeString() : 'pending'}</p><p className="text-sm text-[var(--text-secondary)]">latest runtime poll</p></div>
        </div>
      </section>
      <section className="shell py-14">
        <h2 className="mono mb-6 text-3xl">How it works</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {['Client locks funds in escrow', 'Contributor links a PR', 'Rialo checks GitHub natively', 'Merged PR releases payment'].map((step, index) => (
            <div key={step} className="panel p-5"><span className="mono text-accent">0{index + 1}</span><p className="mt-3 font-semibold">{step}</p></div>
          ))}
        </div>
      </section>
    </main>
  );
}

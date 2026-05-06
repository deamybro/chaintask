import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChainTask',
  description: 'On-chain automated bounty hub built for Rialo primitives.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
          <nav className="shell flex h-16 items-center justify-between gap-4">
            <Link href="/" className="mono text-lg font-bold tracking-normal text-accent">ChainTask</Link>
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Link className="rounded px-3 py-2 hover:bg-surface2 hover:text-white" href="/bounties">Bounties</Link>
              <Link className="rounded px-3 py-2 hover:bg-surface2 hover:text-white" href="/bounties/new">Post</Link>
              <Link className="rounded px-3 py-2 hover:bg-surface2 hover:text-white" href="/dashboard">Dashboard</Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

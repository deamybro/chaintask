/**
 * RIALO RUNTIME SIMULATION
 *
 * On real Rialo, every function in this file would be native contract runtime:
 * - fetchGitHubPR() is a one-line HTTPS call from the smart contract.
 * - pollBounties() is a reactive transaction that sleeps and resumes.
 * - releaseEscrow() is an atomic state transition caused by the poll result.
 *
 * This Node.js module intentionally keeps the same execution shape so public
 * devnet migration is a one-file boundary: replace this module with on-chain
 * instructions and account reads, leaving routes and UI intact.
 */
import crypto from 'crypto';
import db from '../db/schema';
import { Bounty } from '../types';
import { releaseEscrow } from './escrow';
import { fetchPRStatus } from './githubPoller';

interface PollResult {
  bountyId: string;
  prNumber: number;
  merged: boolean;
  action: 'released' | 'still_open' | 'skipped';
}

let runtimeStarted = false;
let lastPollAt: number | null = null;
let timer: NodeJS.Timeout | null = null;

export function startRialoRuntime(): void {
  if (runtimeStarted) return;
  runtimeStarted = true;
  const interval = Number(process.env.POLL_INTERVAL_MS ?? 15000);
  console.log(`[Rialo Runtime] Starting reactive polling engine every ${interval}ms...`);
  timer = setInterval(() => {
    void pollAllActiveBounties();
  }, interval);
  void pollAllActiveBounties();
}

export function stopRialoRuntime(): void {
  if (timer) clearInterval(timer);
  timer = null;
  runtimeStarted = false;
}

export function getRuntimeStatus() {
  const activeBounties = db.prepare(`
    SELECT COUNT(*) as count FROM bounties
    WHERE status = 'in_progress' AND linked_pr_number IS NOT NULL
  `).get() as { count: number };

  return {
    runtime_started: runtimeStarted,
    active_bounties_polled: activeBounties.count,
    poll_interval_ms: Number(process.env.POLL_INTERVAL_MS ?? 15000),
    last_poll_at: lastPollAt,
    rialo_feature: 'reactive_transactions'
  };
}

export async function pollAllActiveBounties(): Promise<PollResult[]> {
  lastPollAt = Math.floor(Date.now() / 1000);
  const activeBounties = db.prepare(`
    SELECT * FROM bounties
    WHERE status = 'in_progress'
    AND linked_pr_number IS NOT NULL
  `).all() as Bounty[];

  const results: PollResult[] = [];
  for (const bounty of activeBounties) {
    results.push(await checkAndSettleBounty(bounty));
  }
  return results;
}

export async function checkAndSettleBounty(bounty: Bounty): Promise<PollResult> {
  if (!bounty.linked_pr_number) {
    return { bountyId: bounty.id, prNumber: 0, merged: false, action: 'skipped' };
  }

  try {
    const prStatus = await fetchPRStatus(
      bounty.repo_owner,
      bounty.repo_name,
      bounty.linked_pr_number
    );

    db.prepare(`
      INSERT INTO poll_log (bounty_id, github_status, action_taken)
      VALUES (?, ?, ?)
    `).run(bounty.id, prStatus.merged ? 'merged' : prStatus.state, prStatus.merged ? 'releasing_escrow' : 'waiting');

    if (prStatus.merged) {
      const txHash = await releaseEscrow(bounty);
      db.prepare(`
        UPDATE poll_log SET tx_hash = ?, action_taken = 'escrow_released'
        WHERE id = (SELECT MAX(id) FROM poll_log WHERE bounty_id = ?)
      `).run(txHash, bounty.id);

      return { bountyId: bounty.id, prNumber: bounty.linked_pr_number, merged: true, action: 'released' };
    }

    return { bountyId: bounty.id, prNumber: bounty.linked_pr_number, merged: false, action: 'still_open' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown GitHub polling error';
    db.prepare(`
      INSERT INTO poll_log (bounty_id, github_status, action_taken)
      VALUES (?, ?, ?)
    `).run(bounty.id, `error: ${message}`, 'skipped');
    console.error(`[Rialo Runtime] Error checking bounty ${bounty.id}:`, err);
    return { bountyId: bounty.id, prNumber: bounty.linked_pr_number, merged: false, action: 'skipped' };
  }
}

export function generateTxHash(): string {
  return `0x${crypto.randomBytes(32).toString('hex')}`;
}

export function generateContractAddress(): string {
  return crypto.randomBytes(20).toString('hex');
}

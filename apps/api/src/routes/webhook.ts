/**
 * RIALO PRIMITIVE: Event-Driven Settlement
 *
 * This webhook is optional demo glue for conventional GitHub events. Rialo's
 * native version does not need GitHub to push an event or a server to receive
 * it; the contract's reactive job checks GitHub directly. Keeping this route
 * isolated makes that contrast explicit.
 */
import { Router } from 'express';
import db from '../db/schema';
import { checkAndSettleBounty } from '../rialo/runtime';
import { Bounty } from '../types';

const router = Router();

router.post('/webhook/github', async (req, res) => {
  const payload = req.body as { pull_request?: { number?: number; merged?: boolean }; repository?: { owner?: { login?: string }; name?: string } };
  const pr = payload.pull_request;
  const repo = payload.repository;
  if (!pr?.number || !repo?.owner?.login || !repo.name) {
    return res.status(202).json({ ignored: true, rialo_feature: 'reactive_transactions' });
  }
  const bounties = db.prepare(`
    SELECT * FROM bounties
    WHERE repo_owner = ? AND repo_name = ? AND linked_pr_number = ? AND status = 'in_progress'
  `).all(repo.owner.login, repo.name, pr.number) as Bounty[];
  const results = [];
  for (const bounty of bounties) results.push(await checkAndSettleBounty(bounty));
  res.json({ results, rialo_feature: 'reactive_transactions' });
});

export default router;

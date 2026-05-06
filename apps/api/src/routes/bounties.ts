import crypto from 'crypto';
import { Router, Response } from 'express';
import db from '../db/schema';
import { Bounty, BountyStatus } from '../types';
import { checkAndSettleBounty } from '../rialo/runtime';
import { fetchIssueStatus, fetchLinkedPRs, fetchPRStatus } from '../rialo/githubPoller';
import { lockEscrow, refundEscrow } from '../rialo/escrow';

const router = Router();

function fail(res: Response, status: number, error: string, rialo_context: string): void {
  res.status(status).json({ error, rialo_context });
}

function bountyById(id: string): Bounty | undefined {
  return db.prepare('SELECT * FROM bounties WHERE id = ?').get(id) as Bounty | undefined;
}

router.get('/bounties', (req, res) => {
  const clauses: string[] = [];
  const values: Array<string> = [];
  if (typeof req.query.status === 'string') {
    clauses.push('status = ?');
    values.push(req.query.status);
  }
  if (typeof req.query.repo === 'string') {
    const [owner, repo] = req.query.repo.split('/');
    if (owner && repo) {
      clauses.push('repo_owner = ? AND repo_name = ?');
      values.push(owner, repo);
    }
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const bounties = db.prepare(`SELECT * FROM bounties ${where} ORDER BY created_at DESC`).all(...values);
  res.json({ bounties, rialo_feature: 'escrow_pda' });
});

router.get('/bounties/:id', async (req, res) => {
  const bounty = bountyById(req.params.id);
  if (!bounty) return fail(res, 404, 'Bounty not found', 'No matching on-chain escrow PDA exists for this id.');
  const poll_log = db.prepare('SELECT * FROM poll_log WHERE bounty_id = ? ORDER BY checked_at DESC, id DESC').all(bounty.id);
  const transactions = db.prepare('SELECT * FROM transactions WHERE bounty_id = ? ORDER BY created_at DESC').all(bounty.id);
  let github_issue = null;
  try {
    github_issue = await fetchIssueStatus(bounty.repo_owner, bounty.repo_name, bounty.issue_number);
  } catch {
    github_issue = { unavailable: true };
  }
  res.json({
    bounty,
    poll_log,
    transactions,
    github_issue,
    rialo_features_used: ['native_https_connectivity', 'reactive_transactions', 'escrow_pda', 'real_world_identity']
  });
});

router.post('/bounties', async (req, res) => {
  try {
    const body = req.body as Partial<Bounty> & { creator_id?: string };
    const required = ['title', 'description', 'repo_owner', 'repo_name', 'issue_number', 'amount_lamports', 'creator_id'] as const;
    for (const key of required) {
      if (body[key] === undefined || body[key] === '') return fail(res, 400, `Missing ${key}`, 'The create_bounty instruction requires complete escrow metadata.');
    }
    const creator = db.prepare('SELECT * FROM users WHERE id = ?').get(body.creator_id);
    if (!creator) return fail(res, 404, 'Creator not found', 'Rialo identity account must exist before funding an escrow PDA.');
    await fetchIssueStatus(String(body.repo_owner), String(body.repo_name), Number(body.issue_number));
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO bounties (id, title, description, repo_owner, repo_name, issue_number, amount_lamports, creator_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, body.title, body.description, body.repo_owner, body.repo_name, body.issue_number, body.amount_lamports, body.creator_id);
    const escrow = await lockEscrow({ bountyId: id, creatorId: String(body.creator_id), amountLamports: Number(body.amount_lamports) });
    res.status(201).json({ bounty: bountyById(id), escrow, rialo_feature: 'escrow_pda' });
  } catch (err) {
    fail(res, 400, err instanceof Error ? err.message : 'Unable to create bounty', 'Rialo would reject this create_bounty instruction before locking funds.');
  }
});

router.patch('/bounties/:id/claim', async (req, res) => {
  try {
    const bounty = bountyById(req.params.id);
    if (!bounty) return fail(res, 404, 'Bounty not found', 'No escrow PDA exists for this bounty id.');
    if (bounty.status !== 'open') return fail(res, 409, 'Only open bounties can be claimed', 'The claim_bounty instruction requires an open escrow.');
    const { assignee_id, linked_pr_number } = req.body as { assignee_id?: string; linked_pr_number?: number };
    if (!assignee_id || !linked_pr_number) return fail(res, 400, 'assignee_id and linked_pr_number are required', 'Rialo must bind an identity account and PR number before reactive polling starts.');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(assignee_id);
    if (!user) return fail(res, 404, 'Assignee not found', 'Assignee identity account does not exist.');
    await fetchPRStatus(bounty.repo_owner, bounty.repo_name, Number(linked_pr_number));
    db.prepare("UPDATE bounties SET status = 'in_progress', assignee_id = ?, linked_pr_number = ? WHERE id = ?")
      .run(assignee_id, linked_pr_number, bounty.id);
    res.json({ bounty: bountyById(bounty.id), rialo_feature: 'reactive_transactions' });
  } catch (err) {
    fail(res, 400, err instanceof Error ? err.message : 'Unable to claim bounty', 'Rialo would reject a watcher registration for an unreadable GitHub PR.');
  }
});

router.get('/bounties/:id/status', async (req, res) => {
  const bounty = bountyById(req.params.id);
  if (!bounty) return fail(res, 404, 'Bounty not found', 'No escrow PDA exists for this bounty id.');
  if (!bounty.linked_pr_number) return fail(res, 400, 'No PR linked yet', 'Reactive HTTPS polling starts after claim_bounty binds a PR.');
  try {
    const github_pr = await fetchPRStatus(bounty.repo_owner, bounty.repo_name, bounty.linked_pr_number);
    res.json({ github_pr, rialo_feature: 'native_https_connectivity' });
  } catch (err) {
    fail(res, 502, err instanceof Error ? err.message : 'GitHub status unavailable', 'The native HTTPS call returned an error to the contract.');
  }
});

router.post('/bounties/:id/verify', async (req, res) => {
  const bounty = bountyById(req.params.id);
  if (!bounty) return fail(res, 404, 'Bounty not found', 'No escrow PDA exists for this bounty id.');
  const result = await checkAndSettleBounty(bounty);
  res.json({ result, bounty: bountyById(bounty.id), rialo_feature: 'reactive_transactions' });
});

router.delete('/bounties/:id', async (req, res) => {
  try {
    const bounty = bountyById(req.params.id);
    if (!bounty) return fail(res, 404, 'Bounty not found', 'No escrow PDA exists for this bounty id.');
    const txHash = await refundEscrow(bounty);
    res.json({ bounty: bountyById(bounty.id), txHash, rialo_feature: 'escrow_pda' });
  } catch (err) {
    fail(res, 409, err instanceof Error ? err.message : 'Unable to cancel bounty', 'Rialo only permits refunds while the escrow is still open.');
  }
});

router.get('/github/issue', async (req, res) => {
  const { owner, repo, issue } = req.query;
  if (typeof owner !== 'string' || typeof repo !== 'string' || typeof issue !== 'string') {
    return fail(res, 400, 'owner, repo, and issue are required', 'Native HTTPS calls need a complete GitHub request target.');
  }
  try {
    const github_issue = await fetchIssueStatus(owner, repo, Number(issue));
    const linked_prs = await fetchLinkedPRs(owner, repo, Number(issue));
    res.json({ github_issue, linked_prs, rialo_feature: 'native_https_connectivity' });
  } catch (err) {
    fail(res, 502, err instanceof Error ? err.message : 'GitHub issue unavailable', 'The native HTTPS call could not read this GitHub issue.');
  }
});

router.get('/poll-log/:bountyId', (req, res) => {
  const poll_log = db.prepare('SELECT * FROM poll_log WHERE bounty_id = ? ORDER BY checked_at DESC, id DESC').all(req.params.bountyId);
  res.json({ poll_log, rialo_feature: 'reactive_transactions' });
});

router.get('/statuses', (_req, res) => {
  const statuses: BountyStatus[] = ['open', 'in_progress', 'completed', 'cancelled'];
  res.json({ statuses, rialo_feature: 'escrow_pda' });
});

export default router;

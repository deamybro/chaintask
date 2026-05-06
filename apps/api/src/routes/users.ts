import { Router, Response } from 'express';
import db from '../db/schema';
import { loginWithEmail, signUpWithEmail } from '../rialo/identity';

const router = Router();

function fail(res: Response, status: number, error: string, rialo_context: string): void {
  res.status(status).json({ error, rialo_context });
}

router.post('/auth/signup', (req, res) => {
  const { email, display_name } = req.body as { email?: string; display_name?: string };
  if (!email || !email.includes('@')) return fail(res, 400, 'A valid email is required', 'Rialo real-world identity starts with verified email ownership.');
  const user = signUpWithEmail(email, display_name || email.split('@')[0]);
  res.status(201).json({ user, rialo_feature: 'real_world_identity' });
});

router.post('/auth/login', (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return fail(res, 400, 'Email is required', 'Rialo login resolves an identity account from email.');
  const user = loginWithEmail(email);
  if (!user) return fail(res, 404, 'User not found', 'No Rialo identity account has been derived for this email yet.');
  res.json({ user, rialo_feature: 'real_world_identity' });
});

router.get('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return fail(res, 404, 'User not found', 'No Rialo identity account exists for this id.');
  const posted_bounties = db.prepare('SELECT * FROM bounties WHERE creator_id = ? ORDER BY created_at DESC').all(req.params.id);
  const claimed_bounties = db.prepare('SELECT * FROM bounties WHERE assignee_id = ? ORDER BY created_at DESC').all(req.params.id);
  const transactions = db.prepare(`
    SELECT t.* FROM transactions t
    JOIN users u ON u.wallet_address IN (t.from_address, t.to_address)
    WHERE u.id = ?
    ORDER BY t.created_at DESC
  `).all(req.params.id);
  res.json({ user, posted_bounties, claimed_bounties, transactions, rialo_feature: 'real_world_identity' });
});

export default router;

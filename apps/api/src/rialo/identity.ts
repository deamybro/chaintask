/**
 * RIALO PRIMITIVE: Real-World Identity
 *
 * On Rialo, users authenticate with email, phone, or social accounts. Their
 * Web3 address is derived at the protocol level, so there are no seed phrases,
 * wallet downloads, or browser extensions. This simulation deterministically
 * derives a wallet address from email to preserve that UX contract.
 */
import crypto from 'crypto';
import db from '../db/schema';
import { User } from '../types';

export function deriveWalletFromEmail(email: string): string {
  const hash = crypto.createHash('sha256').update(`${email.toLowerCase()}rialo-devnet`).digest('hex');
  return hash.substring(0, 40);
}

export function signUpWithEmail(email: string, displayName: string): User {
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as User | undefined;
  if (existing) return existing;
  const id = crypto.randomUUID();
  const walletAddress = deriveWalletFromEmail(email);
  db.prepare(`
    INSERT INTO users (id, email, display_name, wallet_address, balance_lamports)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, email.toLowerCase(), displayName, walletAddress, 1000000000000);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
}

export function loginWithEmail(email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as User | undefined;
}

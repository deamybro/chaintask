/**
 * RIALO PRIMITIVE: On-Chain Escrow / Atomic Fund Release
 *
 * On Rialo, this is a Program Derived Address that holds lamports. The contract
 * owns the PDA, and only release_funds() can move money out after the GitHub
 * HTTPS check passes. The deposit, verification, state update, and payout are
 * contract-controlled transitions with no admin key or off-chain signer.
 */
import crypto from 'crypto';
import db from '../db/schema';
import { Bounty, User } from '../types';
import { generateContractAddress, generateTxHash } from './runtime';

export async function lockEscrow(params: {
  bountyId: string;
  creatorId: string;
  amountLamports: number;
}): Promise<{ txHash: string; contractAddress: string }> {
  const txHash = generateTxHash();
  const contractAddress = generateContractAddress();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(params.creatorId) as User | undefined;
  if (!user) throw new Error('Creator not found');
  if (user.balance_lamports < params.amountLamports) throw new Error('Insufficient balance');

  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET balance_lamports = balance_lamports - ? WHERE id = ?')
      .run(params.amountLamports, params.creatorId);
    db.prepare(`
      INSERT INTO transactions (id, bounty_id, from_address, to_address, amount_lamports, type, tx_hash)
      VALUES (?, ?, ?, ?, ?, 'deposit', ?)
    `).run(crypto.randomUUID(), params.bountyId, user.wallet_address, contractAddress, params.amountLamports, txHash);
    db.prepare('UPDATE bounties SET contract_address = ?, tx_hash = ? WHERE id = ?')
      .run(contractAddress, txHash, params.bountyId);
  });
  tx();
  return { txHash, contractAddress };
}

export async function releaseEscrow(bounty: Bounty): Promise<string> {
  if (!bounty.assignee_id) throw new Error('Bounty has no assignee');
  const assignee = db.prepare('SELECT * FROM users WHERE id = ?').get(bounty.assignee_id) as User | undefined;
  if (!assignee) throw new Error('Assignee not found');
  if (bounty.status === 'completed') throw new Error('Bounty already completed');
  const txHash = generateTxHash();

  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET balance_lamports = balance_lamports + ? WHERE id = ?')
      .run(bounty.amount_lamports, bounty.assignee_id);
    db.prepare("UPDATE bounties SET status = 'completed', completed_at = strftime('%s', 'now') WHERE id = ?")
      .run(bounty.id);
    db.prepare(`
      INSERT INTO transactions (id, bounty_id, from_address, to_address, amount_lamports, type, tx_hash)
      VALUES (?, ?, ?, ?, ?, 'release', ?)
    `).run(crypto.randomUUID(), bounty.id, bounty.contract_address ?? 'rialo_escrow_pda', assignee.wallet_address, bounty.amount_lamports, txHash);
  });
  tx();
  console.log(`[Escrow] Released ${bounty.amount_lamports} lamports to ${assignee.email} | tx: ${txHash}`);
  return txHash;
}

export async function refundEscrow(bounty: Bounty): Promise<string> {
  const creator = db.prepare('SELECT * FROM users WHERE id = ?').get(bounty.creator_id) as User | undefined;
  if (!creator) throw new Error('Creator not found');
  if (bounty.status !== 'open') throw new Error('Only open bounties can be cancelled');
  const txHash = generateTxHash();
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET balance_lamports = balance_lamports + ? WHERE id = ?')
      .run(bounty.amount_lamports, bounty.creator_id);
    db.prepare("UPDATE bounties SET status = 'cancelled' WHERE id = ?").run(bounty.id);
    db.prepare(`
      INSERT INTO transactions (id, bounty_id, from_address, to_address, amount_lamports, type, tx_hash)
      VALUES (?, ?, ?, ?, ?, 'refund', ?)
    `).run(crypto.randomUUID(), bounty.id, bounty.contract_address ?? 'rialo_escrow_pda', creator.wallet_address, bounty.amount_lamports, txHash);
  });
  tx();
  return txHash;
}

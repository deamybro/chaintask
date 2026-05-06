/**
 * RIALO STATE MIRROR
 *
 * This SQLite schema mirrors the account data that would live in Rialo's
 * Solana-compatible VM. Each row maps to contract-owned state: users are
 * protocol identity accounts, bounties are escrow PDAs, poll_log rows are
 * emitted runtime events, and transactions mirror lamport movements.
 *
 * When Rialo public devnet is available, callers should replace reads/writes
 * behind this module with contract account fetches and instructions while
 * keeping the route and frontend contracts stable.
 */
import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const databasePath = process.env.DATABASE_PATH
  ? path.resolve(__dirname, '..', '..', process.env.DATABASE_PATH)
  : path.join(__dirname, '../../chaintask.db');

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    wallet_address TEXT,
    balance_lamports INTEGER DEFAULT 1000000000000,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS bounties (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    issue_number INTEGER NOT NULL,
    amount_lamports INTEGER NOT NULL,
    currency TEXT DEFAULT 'SOL',
    status TEXT DEFAULT 'open',
    creator_id TEXT NOT NULL,
    assignee_id TEXT,
    linked_pr_number INTEGER,
    contract_address TEXT,
    tx_hash TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    completed_at INTEGER,
    FOREIGN KEY (creator_id) REFERENCES users(id),
    FOREIGN KEY (assignee_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS poll_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bounty_id TEXT NOT NULL,
    checked_at INTEGER DEFAULT (strftime('%s', 'now')),
    github_status TEXT,
    action_taken TEXT,
    tx_hash TEXT,
    FOREIGN KEY (bounty_id) REFERENCES bounties(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    bounty_id TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount_lamports INTEGER NOT NULL,
    type TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (bounty_id) REFERENCES bounties(id)
  );
`);

export default db;
